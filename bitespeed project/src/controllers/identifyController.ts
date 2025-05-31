import { RequestHandler } from 'express';
import { pool } from '../db';

export const identifyUser: RequestHandler = async (req, res): Promise<void> => {
  const email = req.query.email as string | undefined;
  const phoneNumber = req.query.phoneNumber as string | undefined;

  if (!email && !phoneNumber) {
    res.status(400).json({ error: 'At least email or phoneNumber is required as query parameters' });
    return;
  }

  const contactsRes = await pool.query(`
    SELECT * FROM Contact 
    WHERE email = $1 OR phoneNumber = $2
  `, [email, phoneNumber]);

  const contacts = contactsRes.rows;

  if (contacts.length === 0) {
    const newContactRes = await pool.query(`
      INSERT INTO Contact (email, phoneNumber, linkPrecedence)
      VALUES ($1, $2, 'primary') RETURNING *
    `, [email, phoneNumber]);

    const newContact = newContactRes.rows[0];

    res.json({
      contact: {
        primaryContactId: newContact.id,
        emails: [newContact.email].filter(Boolean),
        phoneNumbers: [newContact.phoneNumber].filter(Boolean),
        secondaryContactIds: [],
      },
    });
    return;
  }

  let primary = contacts.find(c => c.linkprecedence === 'primary') || contacts[0];
  let allContacts = [...contacts];

  for (let contact of contacts) {
    if (contact.linkprecedence === 'primary' && contact.createdat < primary.createdat) {
      primary = contact;
    }
  }

  const existingEmails = contacts.map(c => c.email);
  const existingPhones = contacts.map(c => c.phonenumber);

  if (!existingEmails.includes(email) || !existingPhones.includes(phoneNumber)) {
    const newSecondaryRes = await pool.query(`
      INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence)
      VALUES ($1, $2, $3, 'secondary') RETURNING *
    `, [email, phoneNumber, primary.id]);

    allContacts.push(newSecondaryRes.rows[0]);
  }

  const secondaryIds = allContacts
    .filter(c => c.linkprecedence === 'secondary' || c.id !== primary.id)
    .map(c => c.id);

  const allEmails = [...new Set(allContacts.map(c => c.email).filter(Boolean))];
  const allPhones = [...new Set(allContacts.map(c => c.phonenumber).filter(Boolean))];

  res.json({
    contact: {
      primaryContactId: primary.id,
      emails: allEmails,
      phoneNumbers: allPhones,
      secondaryContactIds: secondaryIds,
    },
  });
};