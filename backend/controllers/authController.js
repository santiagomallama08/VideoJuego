const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Verificar si ya existe el usuario
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'Usuario ya existe' });

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: 'Usuario no encontrado' });

    // Validar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(400).json({ message: 'Contraseña incorrecta' });

    // ✅ Generar token SIN expiración
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email
      },
      process.env.JWT_SECRET
    );

    // Guardar token en la base de datos
    user.token = token;
    await user.save();

    // Enviar respuesta al frontend
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { register, login };
