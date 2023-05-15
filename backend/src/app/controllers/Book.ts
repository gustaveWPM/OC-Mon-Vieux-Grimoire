import express, { Router } from 'express';
import authMiddleware from '../middlewares/Auth';
import compressMiddleware from '../middlewares/Compress';
import formValidatorAndFileUploadMiddleware from '../middlewares/Multer';
import { createBook, deleteBookById, getBestBooks, getBookById, getBooks, updateBook } from '../services/Book';

const booksController: Router = express.Router();

booksController.get('/bestrating', getBestBooks);
booksController.get('/', getBooks);
booksController.get('/:id', getBookById);
booksController.post('/', authMiddleware, formValidatorAndFileUploadMiddleware, compressMiddleware, createBook);
booksController.put('/:id', authMiddleware, formValidatorAndFileUploadMiddleware, compressMiddleware, updateBook);
booksController.delete('/:id', authMiddleware, deleteBookById);

export default booksController;
