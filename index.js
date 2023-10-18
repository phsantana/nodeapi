const express 		= require('express');
const router 		= express.Router();
const bodyParser 	= require('body-parser');
const cors 			= require('cors');
const helmet 		= require('helmet');
// const fetch 		= require('node-fetch');
const path 			= require('path');
const axios 		= require('axios');
const WebSocket 	= require('ws');

const app = express();

app.use(helmet());
app.use(bodyParser.urlencoded({
	extended: true
}))
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

var imoveisArray = [];

const regioesArray = [
'ac',
'al',
'ap',
'am',
'ba',
'ce',
'df',
'es',
'go',
'ma',
'mt',
'ms',
'mg',
'pa',
'pb',
'pr',
'pe',
'pi',
'rj',
'rn',
'rs',
'ro',
'rr',
'sc',
'sp',
'se',
'to'
];

const server = new WebSocket.Server({
  port: 8080
});

let sockets = [];

server.on('connection', function(socket){
  // Adicionamos cada nova conexão/socket ao array `sockets`
	// console.log('Socket', socket);
	sockets.push(socket);
  // Quando você receber uma mensagem, enviamos ela para todos os sockets
  socket.on('message', function(msg) {
  	console.log('Mensagem recebida',msg);
    // sockets.forEach(s => s.send(msg));
  });
  // Quando a conexão de um socket é fechada/disconectada, removemos o socket do array
  socket.on('close', function() {
    sockets = sockets.filter(s => s !== socket);
  });
});

// async function 
// let clients = [
//   new WebSocket('ws://localhost:8080'),
//   new WebSocket('ws://localhost:8080')
// ];
// clients.map(client => {
//   client.on('message', msg => console.log(msg));
// });
// // Esperamos o cliente conectar com o servidor usando async/await
// await new Promise(resolve => clients[0].once('open', resolve));
// // Imprimi "Hello!" duas vezes, um para cada cliente
// clients[0].send('Hello!');


// Home da página
app.get('/', (request,response) => {
	// console.log('Request',request.socket);
	response.sendFile(path.join(__dirname+'/index.html'));
});

//Adiciona os dados coletados ao array de imóveis e terrenos
app.post('/add-data', (request,response) => {
	console.log(request.body);
	imoveisArray.push(request.body);
	response.send('Retrieving data');
});


// Elimina registros duplicados no array de imóveis
app.post('/eliminate-doubled', (request,response) => {
	
	imoveisArray.forEach((imovel,index,self) => {
		let duplicatasArray = self.filter(i => imovel.url == i.url);


		if(duplicatasArray.length > 1){
			console.log('Imóveis duplicados', duplicatasArray);
			for(let i = 1; i < duplicatasArray.length; i++)
				self.splice(self.indexOf(duplicatasArray[i]),1);
		}
	});

	response.send('Eliminating doubled elements...');
});


// Verifica se o servidor já está disponível para processar uma coleta
app.get('/check-status', (request,response) => {
	response.send(String(imoveisArray.length));
});


app.post('/download', (request,response) => {
	let collectorData = request.body;
	collectorData.imoveis = imoveisArray;

	if(imoveisArray.length)
		sockets[0].send(JSON.stringify(collectorData));

	response.sendStatus(200);
})


// Limpa o array de imoveis do servidor
app.post('/clear', (request,response) => {

	console.log('Total coletado anteriormente', imoveisArray.length);

	imoveisArray = [];
	console.log('Imoveis',imoveisArray.length);
	response.send('Array cleared');
});


// Gera as URLs para cada estado (útil para buscas futuras)
regioesArray.forEach(uf => {
	app.get(`/${uf}`, (request,response) => {
		// console.log(olxData);
		response.send(JSON.stringify(imoveisArray.filter(imovel => imovel.estado.toLowerCase() === uf)));
	});
});



app.use('/', router);

app.use(express.static(__dirname + '/public'));

app.listen(3000, () => console.log('Listen on port 3000'));