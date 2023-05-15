import { Document, Schema, model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

export interface UserDocument extends Document {
  email: string;
  password: string;
}

const userSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

userSchema.plugin(uniqueValidator);
userSchema.index({ email: 'text' });

export default model<UserDocument>('User', userSchema);
