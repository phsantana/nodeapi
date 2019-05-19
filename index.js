const express 		= require('express');
const bodyParser 	= require('body-parser');
const cors 			= require('cors');
const helmet 		= require('helmet');

const app = express();

app.use(helmet());
app.use(bodyParser.json());
app.use(cors());


var dataSetArray = [
{
	"nome": "Phillipe",
	"email": "teste@teste.com",
	"password": "12345"
},

{
	"nome": "Mavado",
	"email": "mavado@teste.com",
	"password": "12345"
},

{
	"nome": "Taven",
	"email": "taven@teste.com",
	"password": "12345"
}];

app.get('/', (request,response) => {
	let dataResponse = dataSetArray.shift();
	dataSetArray.push(dataResponse);
	response.send(dataResponse);
});

app.listen(3000, () => console.log('Listen on port 3000'));