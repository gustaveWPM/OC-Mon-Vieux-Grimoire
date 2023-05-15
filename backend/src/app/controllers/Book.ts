import express, { Router } from 'express';
import authMiddleware from '../middlewares/Auth';
import compressMiddleware from '../middlewares/Compress';
import bookFormMiddleware from '../middlewares/Multer';
import { createBook, deleteBookById, getBestBooks, getBookById, getBooks, setBookRate, updateBook } from '../services/Book';

const booksController: Router = express.Router();

booksController.get('/bestrating', getBestBooks);
booksController.get('/', getBooks);
booksController.get('/:id', getBookById);
booksController.post('/', authMiddleware, bookFormMiddleware, compressMiddleware, createBook);
booksController.post('/:id/rating', authMiddleware, setBookRate);
booksController.put('/:id', authMiddleware, bookFormMiddleware, compressMiddleware, updateBook);
booksController.delete('/:id', authMiddleware, deleteBookById);

export default booksController;
