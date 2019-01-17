const path = require('path');
const uuidv4 = require('uuid/v4');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');


const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');

const app = express();

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'images');
	},
	filename: function (req, file, cb) {
		cb(null, uuidv4() + '-' + file.originalname)
	}
});


const fileFilter = (req, file, cb) => {
	if (
		file.mimetype === 'image/png' ||
		file.mimetype === 'image/jpg' ||
		file.mimetype === 'image/jpeg'
	) {
		cb(null, true);
	} else {
		cb(null, false);
	}
};

app.use(bodyParser.json());
app.use(multer({ storage: storage, fileFilter: fileFilter }).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	next();
});

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
	console.log(error);
	const status = error.stausCode || 500;
	const message = error.message;
	const data = error.data;
	res.status(status).json({ message: message, data: data });
});

mongoose.connect('mongodb+srv://rider:12345678Ah@nodecourse-zfafv.mongodb.net/messages')
	.then(result => {
		const server = app.listen(8080);
		const io = require('./socket').init(server);
		io.on('connection', socket => {
			console.log('New collection')
		});
	})
	.catch(err => console.log(err));