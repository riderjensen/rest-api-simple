const path = require('path');
const uuidv4 = require('uuid/v4');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const graphqlHTTP = require('express-graphql');

const auth = require('./middleware/auth');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const { clearImage } = require('./util/file');


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
app.use(multer({
	storage: storage,
	fileFilter: fileFilter
}).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	if (req.method === 'OPTIONS') {
		return res.sendStatus(200);
	}
	next();
});

app.use(auth);


app.put('/post-image', (req, res, next) => {
	if (!req.isAuth) {
		throw new Error('Not authorized');
	}
	if (!req.file) {
		return res.status(200).json({ message: 'No file provided' });
	}
	if (req.body.oldPath) {
		clearImage(req.body.oldPath);
	}
	imageUrl = req.file.path.replace("\\", "/");
	return res.status(201).json({ message: 'File stored', filePath: imageUrl });
});


app.use('/graphql', graphqlHTTP({
	schema: graphqlSchema,
	rootValue: graphqlResolver,
	graphiql: true,
	formatError(err) {
		if (!err.originalError) {
			return err;
		}
		const data = err.originalError.data;
		const message = err.message || 'An error occured';
		const code = err.originalError.code || 500;
		return { message: message, status: code, data, data };
	}
}));

app.use((error, req, res, next) => {
	console.log(error);
	const status = error.stausCode || 500;
	const message = error.message;
	const data = error.data;
	res.status(status).json({
		message: message,
		data: data
	});
});

mongoose.connect('mongodb+srv://rider:12345678Ah@nodecourse-zfafv.mongodb.net/messages?retryWrites=true')
	.then(result => {
		app.listen(8080);

	})
	.catch(err => console.log(err));