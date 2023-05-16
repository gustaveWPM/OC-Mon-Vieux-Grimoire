import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import ServerConfig from '../../config/ServerConfig';
import AuthReq from '../interfaces/AuthReq';
import bookStaticFieldsValidator from '../lib/BookStaticFieldsValidator';
import { printError } from '../lib/Debugger';
import errorToObj from '../lib/ErrorToObj';
import getSlashEnvelope from '../lib/GetSlashEnvelope';
import isValidReqBody from '../lib/ReqBodyValidator';
import Book, { BookDocument, IRating } from '../models/Book';

const { IMAGES_FOLDER, UNKNOWN_ERROR } = ServerConfig;
const IMAGES_FOLDER_NEEDLE: string = getSlashEnvelope(IMAGES_FOLDER);

namespace Helpers {
  export const getFilenameFromImageUrl = (imageUrl: string): string => imageUrl.split(IMAGES_FOLDER_NEEDLE)[1];
  export function injectCastedBookYear(bookObj: BookDocument) {
    if (typeof bookObj.year === 'string') {
      bookObj.year = parseInt(bookObj.year);
    }
  }

  export const unlinkSyncFromImageUrl = (imageUrl: string) => {
    try {
      fs.unlinkSync(`${IMAGES_FOLDER}/${Helpers.getFilenameFromImageUrl(imageUrl)}`);
    } catch (error) {
      printError(error);
    }
  };

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

export async function getBooks(_: Request, res: Response): Promise<void> {
  try {
    const books: BookDocument[] = await Book.find();
    const booksArray = books.map((book: BookDocument) => book.toObject());
    res.status(StatusCodes.OK).json(booksArray);
  } catch (error) {
    printError(error);
    res.status(StatusCodes.BAD_REQUEST).json(errorToObj(error));
  }
}

export async function getBookById(req: Request, res: Response): Promise<void> {
  try {
    const book: BookDocument | null = await Book.findOne({ _id: req.params.id });
    if (book) {
      res.status(StatusCodes.OK).json(book);
    } else {
      const error = 'Not found';
      printError(error);
      res.status(StatusCodes.NOT_FOUND).json(errorToObj(error));
    }
  } catch (error) {
    printError(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorToObj(error));
  }
}

export async function createBook(req: Request, res: Response, next: NextFunction) {
  async function doCreateBook() {
    const bookObj: BookDocument = JSON.parse(req.body.book);

    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Vous avez essayé d'ajouter un livre sans joindre de fichier" });
    }

    Helpers.injectCastedBookYear(bookObj);

    const book = new Book({
      ...bookObj,
      userId: (req as AuthReq).auth.userId,
      imageUrl: `${req.protocol}://${req.get('host')}${IMAGES_FOLDER_NEEDLE}${req.file.filename}`
    });

    Helpers.computeAndInjectAverageRating(book);

    try {
      const validationError: Error | null = book.validateSync();
      if (validationError) {
        throw validationError;
      }
      await book.save();
      res.status(StatusCodes.CREATED).json({ message: 'Livre enregistré' });
      next();
    } catch (error) {
      printError(error);
      Helpers.unlinkSyncFromImageUrl(book.imageUrl);
      res.status(StatusCodes.BAD_REQUEST).json(errorToObj(error));
    }
  }

  async function process() {
    if (!isValidReqBody(req, ['book'])) {
      return res.status(StatusCodes.BAD_REQUEST).json(errorToObj(UNKNOWN_ERROR));
    }

    return await doCreateBook();
  }

  const r = await process();
  return r;
}

export async function updateBook(req: Request, res: Response) {
  const newFile = req.file;
  const bookObj = newFile
    ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get('host')}${IMAGES_FOLDER_NEEDLE}${newFile.filename}`
      }
    : { ...req.body };

  const bookStaticFieldsValidationError = bookStaticFieldsValidator(bookObj);
  if (bookStaticFieldsValidationError) {
    return res.status(StatusCodes.BAD_REQUEST).json(errorToObj(bookStaticFieldsValidationError));
  }

  try {
    const oldBook = await Book.findOne({ _id: req.params.id });
    if (!oldBook || oldBook.userId !== (req as AuthReq).auth.userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }

    Helpers.injectCastedBookYear(bookObj);

    const forcedFields: Partial<BookDocument> = {
      averageRating: oldBook.averageRating,
      ratings: oldBook.ratings,
      userId: oldBook.userId,
      _id: req.params.id
    };

    await Book.updateOne({ _id: req.params.id }, { ...bookObj, ...forcedFields });
    if (newFile) {
      Helpers.unlinkSyncFromImageUrl(oldBook.imageUrl);
    }
    res.status(StatusCodes.OK).json({ message: 'Livre modifié !' });
  } catch (error) {
    printError(error);
    res.status(StatusCodes.BAD_REQUEST).json(errorToObj(error));
  }
}

export async function deleteBookById(req: Request, res: Response) {
  try {
    const targetedBook: BookDocument | null = await Book.findOne({ _id: req.params.id });
    if (!targetedBook) {
      return res.status(StatusCodes.BAD_REQUEST).json(errorToObj(UNKNOWN_ERROR));
    }
    if (targetedBook.userId !== (req as AuthReq).auth.userId) {
      return res.status(StatusCodes.BAD_REQUEST).json(errorToObj(UNKNOWN_ERROR));
    }
    Helpers.unlinkSyncFromImageUrl(targetedBook.imageUrl);
    await Book.deleteOne({ _id: req.params.id });
    res.status(StatusCodes.OK).json({ message: 'Objet supprimé' });
  } catch (error) {
    printError(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorToObj(error));
  }
}

export async function getBestBooks(_: Request, res: Response): Promise<void> {
  try {
    const topBooks: BookDocument[] = await Book.find({ averageRating: { $exists: true } })
      .sort({ averageRating: -1 })
      .limit(3);

    const booksArray = topBooks.map((topBook: BookDocument) => topBook.toObject());
    res.status(StatusCodes.OK).json(booksArray);
  } catch (error) {
    printError(error);
    res.status(StatusCodes.BAD_REQUEST).json(errorToObj(error));
  }
}

export async function setBookRate(req: Request, res: Response) {
  async function doSetBookRate() {
    const targetedBook: BookDocument | null = await Book.findOne({ _id: req.params.id });
    const currentUserId = (req as AuthReq).auth.userId;
    const newRating = { userId: currentUserId, grade: req.body.rating };

    if (!targetedBook) {
      return res.status(StatusCodes.BAD_REQUEST).json(errorToObj(UNKNOWN_ERROR));
    }

    const ratingsContainCurrentUserId = targetedBook.ratings.some(({ userId }) => userId === currentUserId);
    if (ratingsContainCurrentUserId) {
      return res.status(StatusCodes.NOT_MODIFIED).json(targetedBook);
    }

    targetedBook.ratings.push(newRating as IRating);
    Helpers.computeAndInjectAverageRating(targetedBook);

    try {
      await Book.updateOne({ _id: targetedBook._id }, { ...targetedBook.toObject() });
      await getBookById(req, res);
    } catch (error) {
      printError(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorToObj(error));
    }
  }

  async function process() {
    if (!isValidReqBody(req, ['rating'])) {
      return res.status(StatusCodes.BAD_REQUEST).json(errorToObj(UNKNOWN_ERROR));
    }

    return await doSetBookRate();
  }

  const r = await process();
  return r;
}
