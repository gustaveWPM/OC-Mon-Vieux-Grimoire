import { Document, Schema, model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

export interface UserDocument extends Document {
  email: string;
  password: string;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

UserSchema.plugin(uniqueValidator);

export default model<UserDocument>('User', UserSchema);
