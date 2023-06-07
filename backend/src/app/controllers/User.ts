import express, { Router } from 'express';
import { userLogin } from '../services/User';

import auditPassword from '../middlewares/usersManager/auditPassword';
import hashPassword from '../middlewares/usersManager/hashPassword';
import userSignup from '../middlewares/usersManager/userSignup';

const usersController: Router = express.Router();

usersController.post('/signup', auditPassword, hashPassword, userSignup);
usersController.post('/login', userLogin);

export default usersController;
