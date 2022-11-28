/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText();
	const pattern = /\b[A-Z]{2,}\b/g;
	let m: RegExpExecArray | null;

	let problems = 0;
	const diagnostics: Diagnostic[] = [];
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
		const diagnostic: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is all uppercase.`,
			source: 'ex'
		};
		if (hasDiagnosticRelatedInformationCapability) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Spelling matters'
				},
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Particularly for names'
				}
			];
		}
		diagnostics.push(diagnostic);
	}

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'integer',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'float',
				kind: CompletionItemKind.Text,
				data: 2
			},
			{
				label: 'to',
				kind: CompletionItemKind.Text,
				data: 3
			},
			{
				label: 'output',
				kind: CompletionItemKind.Text,
				data: 4
			},
			{
				label: 'if',
				kind: CompletionItemKind.Text,
				data: 5
			},
			{
				label: 'elseif',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'else',
				kind: CompletionItemKind.Text,
				data: 7
			},
			{
				label: 'while',
				kind: CompletionItemKind.Text,
				data: 8
			},
			{
				label: 'Get',
				kind: CompletionItemKind.Text,
				data: 9
			},
			{
				label: 'for',
				kind: CompletionItemKind.Text,
				data: 10
			},
			{
				label: 'array',
				kind: CompletionItemKind.Text,
				data: 11
			},
			{
				label: 'Function',
				kind: CompletionItemKind.Text,
				data: 12
			},
			{
				label: 'returns',
				kind: CompletionItemKind.Text,
				data: 13
			},
			{
				label: 'Main',
				kind: CompletionItemKind.Text,
				data: 14
			},
			{
				label: 'size',
				kind: CompletionItemKind.Text,
				data: 15
			},
			{
				label: 'SquareRoot',
				kind: CompletionItemKind.Text,
				data: 16
			},
			{
				label: 'RaiseToPower',
				kind: CompletionItemKind.Text,
				data: 17
			},
			{
				label: 'AbsoluteValue',
				kind: CompletionItemKind.Text,
				data: 18
			},
			{
				label: 'RandomNumber',
				kind: CompletionItemKind.Text,
				data: 19
			},
			{
				label: 'SeedRandomNumbers',
				kind: CompletionItemKind.Text,
				data: 20
			},
			{
				label: 'with',
				kind: CompletionItemKind.Text,
				data: 21
			},
			{
				label: 'decimal',
				kind: CompletionItemKind.Text,
				data: 22
			},
			{
				label: 'places',
				kind: CompletionItemKind.Text,
				data: 23
			},
			{
				label: 'next',
				kind: CompletionItemKind.Text,
				data: 24
			},
			{
				label: 'input',
				kind: CompletionItemKind.Text,
				data: 25
			},
			{
				label: 'Put',
				kind: CompletionItemKind.Text,
				data: 26    
			},
			{
				label: 'or',
				kind: CompletionItemKind.Text,
				data: 27
			},
			{
				label: 'and',
				kind: CompletionItemKind.Text,
				data: 28
			},
			{
				label: 'nothing',
				kind: CompletionItemKind.Text,
				data: 29
			},
			{
				label: 'not',
				kind: CompletionItemKind.Text,
				data: 30
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1){
			item.detail = 'integer detalles';
			item.documentation = 'integer es un tipo de dato, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 2){
			item.detail = 'float detalles';
			item.documentation = 'float es un tipo de dato, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 3){
			item.detail = 'to detalles';
			item.documentation = 'Put es parte de la expresión [Put [item] to output] que permite imprimir en la salida estandar, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 4){
			item.detail = 'output detalles';
			item.documentation = 'Put es parte de la expresión [Put [item] to output] que permite imprimir en la salida estandar, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 5){
			item.detail = 'if detalles';
			item.documentation = 'if es un condicional, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 6){
			item.detail = 'elseif detalles';
			item.documentation = 'elseif es parte de una expresion condicional, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 7){
			item.detail = 'else detalles';
			item.documentation = 'else es es parte de una expresion condicional, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 8){
			item.detail = 'while detalles';
			item.documentation = 'while es un ciclo que se ejecuta mientras se cumple una condicion, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 9){
			item.detail = 'Get detalles';
			item.documentation = 'Get es parte de la expresión [Get next input], para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 10){
			item.detail = 'for detalles';
			item.documentation = 'for es un ciclo que se recorre cierto número de veces, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 11){
			item.detail = 'array detalles';
			item.documentation = 'array es un arreglo de un tipo de datos definidos, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 12){
			item.detail = 'Function detalles';
			item.documentation = 'Function es parte de la expresión para crear una funcion, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 13){
			item.detail = 'returns detalles';
			item.documentation = 'returns es parte de la expresión de una función e indica el valor de retorno de la función, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 14){
			item.detail = 'Main detalles';
			item.documentation = 'Main es la función principal del programa, es antecedida por declaración de funciones, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 15){
			item.detail = 'size detalles';
			item.documentation = 'size es un atributo de un arreglo que retorna el tamaño, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 16){
			item.detail = 'SquareRoot detalles';
			item.documentation = 'SquareRoot es una función matemática integrada en Coral, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 17){
			item.detail = 'RaiseToPower detalles';
			item.documentation = 'RaiseToPower es una función matemática integrada en Coral, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 18){
			item.detail = 'AbsoluteValue detalles';
			item.documentation = 'AbsoluteValue es una función matemática integrada en Coral, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 19){
			item.detail = 'RandomNumber detalles';
			item.documentation = 'RandomNumber es una función de aleatoriedad integrada en Coral, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 20){
			item.detail = 'SeedRandomNumbers detalles';
			item.documentation = 'SeedRandomNumbers es una función de aleatoriedad integrada, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 21){
			item.detail = 'with detalles';
			item.documentation = 'with es parte de la expresión [Put floatvar to output with 3 decimal places] para redondear valores, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 22){
			item.detail = 'decimal detalles';
			item.documentation = 'decimal es parte de la expresión [Put floatvar to output with 3 decimal places] para redondear valores, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 23){
			item.detail = 'places detalles';
			item.documentation = 'places es parte de la expresión [Put floatvar to output with 3 decimal places] para redondear valores, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 24){
			item.detail = 'next detalles';
			item.documentation = 'next es parte de la expresión [Get next input], para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 25){
			item.detail = 'input detalles';
			item.documentation = 'input es parte de la expresión [Get next input], para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 26){
			item.detail = 'Put detalles';
			item.documentation = 'Put es parte de la expresión [Put [item] to output] que permite imprimir en la salida estandar, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 27){
			item.detail = 'or detalles';
			item.documentation = 'or es un operador condicional, usado en condiciones, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 28){
			item.detail = 'and detalles';
			item.documentation = 'and es un operador condicional, usado en condiciones, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 29){
			item.detail = 'nothing detalles';
			item.documentation = 'nothing es un operador condicional, usado en condiciones, para más información visitar: https://corallanguage.org/spec/';
		
		}else if (item.data === 30){
			item.detail = 'not detalles';
			item.documentation = 'not es un operador condicional, usado en condiciones, para más información visitar: https://corallanguage.org/spec/';
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
