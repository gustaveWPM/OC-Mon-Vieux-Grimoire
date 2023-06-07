import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import ServerConfig from '../../config/ServerConfig';
import AuthReq from '../interfaces/AuthReq';
import bookStaticFieldsValidator from '../lib/bookStaticFieldsValidator';
import { printError } from '../lib/debugger';
import errorToObj from '../lib/errorToObj';
import getSlashEnvelope from '../lib/getSlashEnvelope';
import reqBodyContainsMandatoryFieldsKeys from '../lib/reqBodyContainsMandatoryFieldsKeys';
import Book, { BOOKS_OPTIONAL_STRING_INPUT_FIELDS, BOOKS_REQUIRED_STRING_INPUT_FIELDS, BookDocument, BookRating } from '../models/Book';

const { IMAGES_FOLDER, UNKNOWN_ERROR } = ServerConfig;
const IMAGES_FOLDER_NEEDLE: string = getSlashEnvelope(IMAGES_FOLDER);
const BEST_BOOKS_AMOUNT_LIMIT: number = 3;

namespace Helpers {
  export const getFilenameFromImageUrl = (imageUrl: string): string => imageUrl.split(IMAGES_FOLDER_NEEDLE)[1];
  export function injectCastedBookYear(bookObj: BookDocument) {
    if (typeof bookObj.year === 'string') {
      bookObj.year = parseInt(bookObj.year);
    }
  }

  export function injectTrimmedStringInputFields(bookObj: BookDocument) {
    const bookStringInputFields: (keyof BookDocument)[] = [...BOOKS_REQUIRED_STRING_INPUT_FIELDS, ...BOOKS_OPTIONAL_STRING_INPUT_FIELDS];

    for (const stringInputField of bookStringInputFields) {
      if (typeof bookObj[stringInputField] === 'string') {
        (bookObj[stringInputField] as string) = bookObj[stringInputField].trim();
      }
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
    Helpers.injectTrimmedStringInputFields(bookObj);

    const book = new Book({
      ...bookObj,
      userId: (req as AuthReq).auth.userId,
      imageUrl: `${req.protocol}://${req.get('host')}${IMAGES_FOLDER_NEEDLE}${req.file.filename}`
    });

    Helpers.computeAndInjectAverageRating(book);

    try {
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
    if (!reqBodyContainsMandatoryFieldsKeys(req, ['book'])) {
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
    const targetedBookId = req.params.id;
    const oldBook = await Book.findOne({ _id: targetedBookId });
    if (!oldBook || oldBook.userId !== (req as AuthReq).auth.userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }

    Helpers.injectCastedBookYear(bookObj);
    Helpers.injectTrimmedStringInputFields(bookObj);

    const booksUpdateForcedFields: (keyof BookDocument)[] = ['averageRating', 'ratings', 'userId'];
    const forcedFields: Partial<BookDocument> = { _id: targetedBookId };
    for (const forcedField of booksUpdateForcedFields) {
      forcedFields[forcedField] = oldBook[forcedField];
    }

    await Book.updateOne({ _id: targetedBookId }, { ...bookObj, ...forcedFields });
    if (newFile) {
      Helpers.unlinkSyncFromImageUrl(oldBook.imageUrl);
    }
    res.status(StatusCodes.OK).json({ message: 'Livre modifié' });
  } catch (error) {
    printError(error);
    res.status(StatusCodes.BAD_REQUEST).json(errorToObj(error));
  }
}

export async function deleteBookById(req: Request, res: Response) {
  try {
    const targetedBookId = req.params.id;
    const targetedBook: BookDocument | null = await Book.findOne({ _id: targetedBookId });
    if (!targetedBook) {
      return res.status(StatusCodes.BAD_REQUEST).json(errorToObj(UNKNOWN_ERROR));
    }
    if (targetedBook.userId !== (req as AuthReq).auth.userId) {
      return res.status(StatusCodes.BAD_REQUEST).json(errorToObj(UNKNOWN_ERROR));
    }
    Helpers.unlinkSyncFromImageUrl(targetedBook.imageUrl);
    await Book.deleteOne({ _id: targetedBookId });
    res.status(StatusCodes.OK).json({ message: 'Livre supprimé' });
  } catch (error) {
    printError(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorToObj(error));
  }
}

export async function getBestBooks(_: Request, res: Response): Promise<void> {
  try {
    const topBooks: BookDocument[] = await Book.find({ averageRating: { $exists: true } })
      .sort({ averageRating: -1 })
      .limit(BEST_BOOKS_AMOUNT_LIMIT);

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

    targetedBook.ratings.push(newRating as BookRating);
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
    if (!reqBodyContainsMandatoryFieldsKeys(req, ['rating'])) {
      return res.status(StatusCodes.BAD_REQUEST).json(errorToObj(UNKNOWN_ERROR));
    }

    return await doSetBookRate();
  }

  const r = await process();
  return r;
}
