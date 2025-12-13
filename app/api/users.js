import connectToDatabase from '../../lib/mongodb';
import User from '../../models/User';

export default async function handler(req, res) {
  await connectToDatabase();

  if (req.method === 'GET') {
    const users = await User.find({});
    return res.status(200).json(users);
  }

  if (req.method === 'POST') {
    const { name, email } = req.body;
    try {
      const newUser = await User.create({ name, email });
      return res.status(201).json(newUser);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}