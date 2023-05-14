import express, { Router } from 'express';
import { userLogin, userSignup } from '../services/User';

const usersController: Router = express.Router();

usersController.post('/signup', userSignup);
usersController.post('/login', userLogin);

export default usersController;
