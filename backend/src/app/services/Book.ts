import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { IExtendedReq } from '../interfaces/IExtendedReq';
import Book, { BookDocument } from '../models/Book';

namespace Helpers {
  export function castBookYear(bookObj: BookDocument) {
    if (typeof bookObj.year === 'string') {
      bookObj.year = parseInt(bookObj.year);
    }
  }

  export function computeAndInjectAverageRating(book: BookDocument) {
    const ratings = book.ratings;
    const q = ratings.length;
    if (q === 1) {
      book.averageRating = ratings[0].grade;
    }
    const sum = ratings.reduce((currentSum, currentUplet) => {
      return currentSum + currentUplet.grade;
    }, 0);
    const computedAverageRating = sum / q;
    book.averageRating = computedAverageRating;
  }
}

export async function getBooks(req: Request, res: Response): Promise<void> {
  try {
    const books: BookDocument[] = await Book.find();
    const booksArray = books.map((book: BookDocument) => book.toObject());
    res.status(StatusCodes.OK).json(booksArray);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error });
  }
}

export async function getBookById(req: Request, res: Response): Promise<void> {
  try {
    const book: BookDocument | null = await Book.findOne({ _id: req.params.id });
    if (book) {
      res.status(StatusCodes.OK).json(book);
    } else {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'Book not found' });
    }
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error });
  }
}

export async function createBook(req: Request, res: Response, next: NextFunction) {
  const bookObj: BookDocument = JSON.parse(req.body.book);
  if (!req.file) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Requête de création de livre sans fichier joint' });
  }
  delete bookObj._id;
  Helpers.castBookYear(bookObj);
  const book = new Book({
    ...bookObj,
    userId: (req as IExtendedReq).auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });
  Helpers.computeAndInjectAverageRating(book);

  try {
    await book.save();
    res.status(StatusCodes.CREATED).json({ message: 'Livre enregistré' });
    next();
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error });
  }
}
