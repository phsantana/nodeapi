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

const getCityName = slug => slug.split('/').pop();

var linksDosProdutosArray = [];
var imoveisArray = [];
var paginasComErroArray = [];

const urlBase = 'https://www.olx.com.br';

const tiposArray = [
	'terrenos',
	'venda'
	];

var slugsPorRegiaoArray =

{
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

var socket;
var cidade;
var regioesArray = Object.keys(slugsPorRegiaoArray);

function coletarUrls(slug,uf){

		console.log('COLETANDO URLS');

		cidade = getCityName(slug);

		console.log('Estado coletado',uf);
		console.log('Cidade coletada', cidade);

		tiposArray.forEach(tipo => {
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
					console.log('On page:',`${urlBase}/imoveis/${tipo}/estado-${uf}/${slug}?o=${pagina}`);
				});
			}
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
			// console.log('OK', link);
			let coleta = getDate();
	
			if(!invalidType(filtroColetor(htmlDaPagina,/"real_estate_type":/).toLowerCase())){
				fetch('http://localhost:3000/add-data',{
					method: 'POST',
					headers: {'Content-Type': 'application/json; charset=UTF-8'},
					body: JSON.stringify({
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
					})
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
			if(paginasComErroArray.length){
				console.log('Paginas com erros restantes',paginasComErroArray.length);
				repiqueControlador()
				clearInterval(timer)
			}
			else{
				console.log('BUSCA FINALIZADA');

				let estado = regioesArray[0];

				linksDosProdutosArray = [];
				console.log('Links dos produtos', linksDosProdutosArray);

				fetch('http://localhost:3000/'+estado)
  				.then(response => response.json())
  				.then(response => {
  					gerarArquivo({
  						estado: estado,
  						tipos: tiposArray,
  						cidade: cidade,
  						imoveis: response
  					});
  				});

				clearInterval(timer)
			}
	},5000);
}

//REPIQUE
function repiqueControlador(){

	linksDosProdutosArray = [];
	console.log('Páginas restantes:', paginasComErroArray.length);

	let intervalo = 30000;

	if((paginasComErroArray.length > 500) && (paginasComErroArray.length <= 900)){
			intervalo = 10000;
			console.log('Intervalo de 10 segundos');
	}

	if(paginasComErroArray.length <= 500){
		intervalo = 5000;
		console.log('Intervalo de 5 segundos');
	}

	setTimeout(() => {
		if(!paginasComErroArray.length)// verificando se está vazio o array de paginas com erro
			eliminarDuplicadas(imoveisArray);

		else
			repique();
	},intervalo);
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
			// console.log('OK',link);
			let coleta = getDate();
	
			if(!invalidType(filtroColetor(htmlDaPagina,/"real_estate_type":/).toLowerCase())){
				fetch('http://localhost:3000/add-data',{
					method: 'POST',
					headers: {'Content-Type': 'application/json; charset=UTF-8'},
					body: JSON.stringify({
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
					})
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

	fetch('http://localhost:3000/eliminate-doubled',{method: 'POST'})
	.then(response => response.text())
	.then(response => {

		console.log(response);

		setTimeout(() => {
			paginasComErroArray = [];
			console.log('FINALIZANDO BUSCA');
	
			let estado = regioesArray[0];
	
			fetch('http://localhost:3000/'+estado)
  			.then(response => response.json())
  			.then(response => {
  				gerarArquivo({
  					estado: estado,
  					tipos: tiposArray,
  					cidade: cidade,
  					imoveis: response
  				});
  				iniciarColeta();
  			});
			},2000);
	});
}

function iniciarColeta(){

	console.log('Iniciando coleta...');

    			// sendResponse(user);
    			fetch('http://localhost:3000/clear',{
    				method: 'POST'
    			})
    			.then(response => response.text())
    			.then(response => console.log(response));

    			if(regioesArray.length){
    				if(!slugsPorRegiaoArray[regioesArray[0]].length)
						regioesArray.shift();
		
					let slug = slugsPorRegiaoArray[regioesArray[0]].shift()
					let uf = regioesArray[0];

					let timer = setInterval(() => {

						fetch('http://localhost:3000/check-status')
						.then(response => response.text())
						.then(response => {
							let taskServer = parseInt(response);

							console.log('Status do servidor:',taskServer);

							if(!taskServer){
								coletarUrls(slug,uf);
								clearInterval(timer);
							}
							else{
								fetch('http://localhost:3000/clear')
								.then(response => response);
							}
						})
					},5000);
    			}
  			}


const buttonStartCollect = document.querySelector('#iniciar-coleta');

buttonStartCollect.addEventListener('click', () => {
	iniciarColeta();
});