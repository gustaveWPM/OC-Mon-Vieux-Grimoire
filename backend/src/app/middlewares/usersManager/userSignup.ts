import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { printError } from '../../lib/debugger';
import errorToObj from '../../lib/errorToObj';
import User from '../../models/User';

export async function userSignup(req: Request, res: Response) {
  try {
    const { email: formattedEmail, password: hashedPassword } = req.body;
    const user = new User({
      email: formattedEmail,
      password: hashedPassword
    });

    const validationError: Error | null = user.validateSync();
    if (validationError) {
      throw validationError;
    }

    await user.save();
    res.status(StatusCodes.CREATED).json({ message: 'Utilisateur créé' });
  } catch (error) {
    printError(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorToObj(error));
  }
}

export default userSignup;
