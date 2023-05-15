import express, { Router } from 'express';
import authMiddleware from '../middlewares/Auth';
import compressMiddleware from '../middlewares/Compress';
import formValidatorAndFileUploadMiddleware from '../middlewares/Multer';
import { createBook, getBookById, getBooks } from '../services/Book';

const booksController: Router = express.Router();

booksController.get('/', getBooks);
booksController.get('/:id', getBookById);
// ToDo: bestrating
booksController.post('/', authMiddleware, formValidatorAndFileUploadMiddleware, compressMiddleware, createBook);
// router.put('/:id', auth, multer, booksController.updateBook);
// router.delete('/:id', auth, booksController.deleteBookById);

export default booksController;
