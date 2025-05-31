import express from 'express';
import { identifyUser } from '../controllers/identifyController';

const router = express.Router();

router.get('/', identifyUser);

export default router;