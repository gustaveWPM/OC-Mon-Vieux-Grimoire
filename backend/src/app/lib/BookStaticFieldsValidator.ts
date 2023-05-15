import Book, { BookDocument } from '../models/Book';

const DUMMY_BOOK_COMPUTED_PROPS: Partial<BookDocument> = {
  averageRating: 0,
  imageUrl: 'dummyUrl'
};

export function bookStaticFieldsValidator(bookObj: object): Error | null {
  const bookToValidate = new Book({ ...bookObj, ...DUMMY_BOOK_COMPUTED_PROPS });
  const validationError: Error | null = bookToValidate.validateSync();

  if (validationError) {
    return validationError;
  }
  return null;
}

export default bookStaticFieldsValidator;
