const express 		= require('express');
const bodyParser 	= require('body-parser');
const cors 			= require('cors');
const helmet 		= require('helmet');
const fetch 		= require('node-fetch');

const app = express();

app.use(helmet());
app.use(bodyParser.json());
app.use(cors());

function flushArrays(...a){
	a.forEach(b => {
		b = null;
	})
}

var filtroColetor = (text,filtro) => {

	let resultado = text.replace(/(&quot;)|(&quot;:)/g,'').split(',').filter(sentence => sentence.match(filtro));

	if(resultado.length)
		return 	resultado
				.pop()
				.replace(filtro,'')
				.replace(/\"|\}/g,'')
				.replace(/\&amp;/,'&')
				.trim()
	else
		return '';
}

function invalidType(type){
	const notValidTypesArray = [
	'sítios e chácaras',
	'chácaras',
	'sítios',
	'fazendas'
	];

	return notValidTypesArray.includes(type);
}

function getDate(){
	const dateNow = Date().split(/\s/g);
	return {
		mes: dateNow[1],
		dia: dateNow[2],
		ano: dateNow[3],
		hora: dateNow[4]
	}
}

var conversorDeData = data => {
	let tempData = data.split(/-/);

	return tempData[2]+'/'+tempData[1]+'/'+tempData[0];
}

var linksDosProdutosArray = [];
var imoveisArray = [];
var paginasComErroArray = [];

const urlBase = 'https://www.olx.com.br';
const tiposArray = [
	'terrenos',
	'venda'
	];

const slugsPorRegiaoArray = {
am:[
	"regiao-de-manaus/outras-cidades/parintins"
],
ba:[
	"regiao-de-vitoria-da-conquista-e-barreiras/todas-as-cidades/vitoria-da-conquista"
],
ce:[
	"regiao-de-juazeiro-do-norte-e-sobral"
],
mg:[
	"regiao-de-uberlandia-e-uberaba/triangulo-mineiro/ituiutaba",
	"regiao-de-uberlandia-e-uberaba/triangulo-mineiro/uberlandia"
],
ms:[
	"mato-grosso-do-sul/dourados"
],
pa:[
	"regiao-de-maraba/todas-as-cidades/maraba",
	"regiao-de-santarem/todas-as-cidades/santarem"
],
pb:[
	"paraiba/campina-grande-guarabira-e-regiao/campina-grande"
],
pr:[
	"regiao-de-maringa/regiao-de-maringa/maringa",
	"regiao-de-maringa/regiao-de-maringa/paicandu",
	"regiao-de-maringa/regiao-de-maringa/sarandi",
	"regiao-de-londrina/regiao-de-londrina/londrina"
],
rj:[
	"serra-angra-dos-reis-e-regiao/vale-do-paraiba/resende"
],
rn:[
	"rio-grande-do-norte/outras-cidades/mossoro"
],
rs:[
	"regioes-de-caxias-do-sul-e-passo-fundo/regiao-de-passo-fundo/passo-fundo"
],
sc:[
	"oeste-de-santa-catarina/regiao-de-chapeco/chapeco"
],
sp:[
	"regiao-de-presidente-prudente/regiao-de-aracatuba/aracatuba",
	"regiao-de-bauru-e-marilia/regiao-de-bauru/bauru",
	"regiao-de-bauru-e-marilia/regiao-de-marilia/marilia",
	"regiao-de-presidente-prudente/pres-prudente-aracatuba-e-regiao/presidente-prudente",
	"regiao-de-ribeirao-preto/regiao-de-ribeirao-preto/ribeirao-preto"
]
};

const regioesArray = Object.keys(slugsPorRegiaoArray);

function coletarUrls(){

		console.log('COLETANDO URLS');

		tiposArray.forEach(tipo => {
			regioesArray.forEach(uf => {
				slugsPorRegiaoArray[uf].forEach(slug => {
					for(let pagina = 1; pagina <= 100; pagina++){
						fetch(`${urlBase}/imoveis/${tipo}/estado-${uf}/${slug}?o=${pagina}`,{
							method: 'GET',
							mode: 'no-cors',
							headers: {'Content-Type': 'text/html'}
						})
						.then(response => response.text())
						.then(htmlPage => {		
							// console.log('OK');
							let tempAds = htmlPage.split(/adList|searchCategories/)[1];
							tempAds = tempAds.replace(/(&quot;)|(&quot;:)/g,'');				
							linksDosProdutosArray.push(...tempAds.split(',').filter(items => items.match(/url:/)).map(url => url.replace(/url:/,'')));
						})
						.catch(error => {
							console.error('Error: ',error);
						});
					}
				});
			});
		});
	
		var arrayLength = linksDosProdutosArray.length;
	
		let timer = setInterval(() => {
	
			if(arrayLength < linksDosProdutosArray.length)
				arrayLength = linksDosProdutosArray.length
			else{
				console.log('Total de registros:', linksDosProdutosArray.length);
				coletarInformacoesDasPaginas();
				clearInterval(timer);
			}
		},5000);
}

function coletarInformacoesDasPaginas(){

	console.log('COLETANDO INFORMAÇÕES DAS PÁGINAS');

	linksDosProdutosArray.forEach(link => {
		fetch(link,{
			method: 'GET',
			mode: 'no-cors',
			headers: {'Content-Type': 'text/html'}
		})
		.then(response => response.text())
		.then(htmlDaPagina => {
			console.log('OK', link);
			let coleta = getDate();
	
			if(!invalidType(filtroColetor(htmlDaPagina,/"real_estate_type":/).toLowerCase())){
				imoveisArray.push({
					tipo: filtroColetor(htmlDaPagina,/"real_estate_type":/),
					dataDoAnuncio: conversorDeData(filtroColetor(htmlDaPagina,/listTime:/).split('T').shift()),
					bairro: filtroColetor(htmlDaPagina,/neighbourhood:/),
					cidade: filtroColetor(htmlDaPagina,/municipality:/),
					estado: filtroColetor(htmlDaPagina,/"state":/),
					preco: filtroColetor(htmlDaPagina,/priceValue:/),
					anunciante: filtroColetor(htmlDaPagina,/"sellerName":/),
					quartos: !filtroColetor(htmlDaPagina,/"real_estate_type":/).toLowerCase().match(/terrenos/) ? filtroColetor(htmlDaPagina,/"rooms":/) : '',
					areaConstruida: filtroColetor(htmlDaPagina,/"size":/) ? (filtroColetor(htmlDaPagina,/"size":/)+"m²") : '',
					url: link,
					dataDaColeta: `${coleta.dia}/${coleta.mes}/${coleta.ano}`,
					horaDaColeta: `${coleta.hora}`
				});
			}
		})
		.catch(error => {
			console.error('Erro na página:',error);
			paginasComErroArray.push(link);
		})
	});

	var arrayLength = imoveisArray.length;

	let timer = setInterval(() => {

		if(arrayLength < imoveisArray.length)
			arrayLength = imoveisArray.length
		else{
			if(paginasComErroArray.length){
				console.log('Paginas com erros restantes',paginasComErroArray.length);
				repiqueControlador()
				clearInterval(timer)
			}
			else{
				// gerarArquivo(imoveisArray,currentState,nomeCidade);
				clearInterval(timer)
			}

		}
	},5000);
}

//REPIQUE
function repiqueControlador(){

	flushArrays(linksDosProdutosArray);

	setTimeout(() => {
		if(!paginasComErroArray.length)// verificando se está vazio o array de paginas com erro
			eliminarDuplicadas(imoveisArray);

		else
			repique();
	},5000);
}


function repique(){

	console.log('REPIQUE');

	paginasComErroArray.forEach((link,index) => {
		fetch(link,{
			method: 'GET',
			mode: 'no-cors',
			headers: {'Content-Type': 'text/html'}
		})
		.then(response => response.text())
		.then(htmlDaPagina => {
			console.log('OK',link);
			let coleta = getDate();
	
			if(!invalidType(filtroColetor(htmlDaPagina,/"real_estate_type":/).toLowerCase())){
				imoveisArray.push({
					tipo: filtroColetor(htmlDaPagina,/"real_estate_type":/),
					dataDoAnuncio: conversorDeData(filtroColetor(htmlDaPagina,/listTime:/).split('T').shift()),
					bairro: filtroColetor(htmlDaPagina,/neighbourhood:/),
					cidade: filtroColetor(htmlDaPagina,/municipality:/),
					estado: filtroColetor(htmlDaPagina,/"state":/),
					preco: filtroColetor(htmlDaPagina,/priceValue:/),
					anunciante: filtroColetor(htmlDaPagina,/"sellerName":/),
					quartos: !filtroColetor(htmlDaPagina,/"real_estate_type":/).toLowerCase().match(/terrenos/) ? filtroColetor(htmlDaPagina,/"rooms":/) : '',
					areaConstruida: filtroColetor(htmlDaPagina,/"size":/) ? (filtroColetor(htmlDaPagina,/"size":/)+"m²") : '',
					url: link,
					dataDaColeta: `${coleta.dia}/${coleta.mes}/${coleta.ano}`,
					horaDaColeta: `${coleta.hora}`
				});
			}
			paginasComErroArray.splice(index,1);
		})
	});

	repiqueControlador()
}

//Eliminando URL's duplicadas 
function eliminarDuplicadas(imoveis){

	console.log('ELIMINANDO DUPLICATAS');

	imoveis.forEach(imovel => {
		paginasComErroArray.forEach((link,index,self) => {
			if(imovel.url === link)
				self.splice(index,1)
		})
	});

	setTimeout(() => {
		flushArrays(paginasComErroArray);
		console.log('FINALIZANDO BUSCA');
	},2000);
}

coletarUrls();


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

regioesArray.forEach(uf => {
	app.get(`/${uf}`, (request,response) => {
		// console.log(olxData);
		response.send(JSON.stringify(imoveisArray.filter(imovel => imovel.estado.toLowerCase() === uf)));
	});
});

app.listen(3000, () => console.log('Listen on port 3000'));