const chalk = require('chalk');
const fs = require('fs');
const { resolve } = require('path');
const yargs = require('yargs');
const { name, version } = require('../../package.json');

const header = (title, cssUrl) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
${cssUrl ? `<link rel="stylesheet" href=${cssUrl}>` : ''}
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<!-- Your generated content here... -->
`;

const footer = `</body>
</html>
`;

const pathDelimiter = '/';
// process.platform !== 'win32' ? '/' : '\\';

const convertToHTML = (fileInfo, cssUrl) => {
    return new Promise((resolve, reject) => {
        fs.promises.readFile(fileInfo, 'utf-8')
        .then(content => {
            if(!content) {
                throw new Error('file does not exist');
            }
                //based on the os set different type of delimiters(still developing) 
                const delimiter = process.platform === 'win32' ? '\r\n' : '\n';
                let title = "";
                //api doesnt work on other user's sysyem so replaced the delimiter to /\r?\n\r?\n/ at split
                const paragraphs = content.split(/\r?\n\r?\n/).map((e, i) => {
                    if(i === 0) {
                        title = e;
                        return e;
                    }
                    if(i === 1 && !e.startsWith(delimiter)) {
                        title = "";
                    }
                    return e.startsWith('\n') ? `<p>${e.substring(1)}</p>${delimiter}` : `<p>${e}</p>${delimiter}`
                });
                //set 0st paragraphs to filename and title.
                paragraphs[0] = `<h1>${paragraphs[0]}</h1>${delimiter}`;
                const filename = fileInfo.split(pathDelimiter)[fileInfo.split(pathDelimiter).length - 1];
                resolve(header(title ? title : filename, cssUrl) + paragraphs.join("") + footer);
            }).catch(err => {
                throw err;
            });
    });
};

//convert MD files to HTML. text that has header 1 will be encased in <h1>...</h1>
const mdToHTML = (fileInfo, cssUrl) =>{
    return new Promise((resolve, reject) =>{
        fs.promises.readFile(fileInfo, 'utf-8')
        .then(content => {
            if(!content) {
                throw new Error('file does not exist');
            }

            //Find out if the user is running on wins or mac.
            const delimiter = process.platform === 'win32' ? '\r\n' : '\n';
            let title = "";
         
            //Change all of the MD headers to html headers
            const paragraphs = content.split(/\r?\n\r?\n/).map((e, i) => {
                if(e.startsWith("# ")){
                    return `<h1>${e.substring(2)}</h1>${delimiter}`;
                }else if(e.startsWith("## ")){
                    return `<h2>${e.substring(3)}</h2>${delimiter}`;
                }else if(e.startsWith("### ")){
                    return `<h3>${e.substring(4)}</h3>${delimiter}`;
                }else if(e.startsWith("#### ")){
                    return `<h4>${e.substring(5)}</h4>${delimiter}`;
                }else if(e.startsWith("##### ")){
                    return `<h5>${e.substring(6)}</h5>${delimiter}`;
                }else if(e.startsWith("###### ")){
                    return `<h6>${e.substring(7)}</h6>${delimiter}`;
                }else{
                    return `<p>${e.replace(/```/, "")}</p>${delimiter}`;
                }
            });
            
            const filename = fileInfo.split(pathDelimiter)[fileInfo.split(pathDelimiter).length - 1];
            resolve(header(filename.startsWith('.\\') ? filename.substring(2, filename.length-3) : filename.substring(0 , filename.length-3), cssUrl) + paragraphs.join("") + footer);
        }).catch(err => {
            throw err;
        })
    });
};

//save the files to "dist" folder
const saveToFile = (html, outputDir = 'dist', filename) => {
    !fs.existsSync(outputDir) && fs.mkdirSync(outputDir);
    fs.promises.writeFile(`${outputDir}${pathDelimiter}${filename}.html`, html)
        .then(() => console.log(chalk.green(`${filename}.html is created!`)))
        .catch(err => console.log(chalk.red(err.message)));
}
//it is working for converting files to html
exports.convertFilesToHTML = async (filename, cssUrl, outputDir) => {
    let fileInfos = [];
    try{
        //if the input content is folder then set the input value as a folder or not just set file.
        if(fs.lstatSync(filename).isDirectory()) {
            const dir = filename.split(pathDelimiter).slice(0, filename.split(pathDelimiter).length).join(pathDelimiter);
            const content = await fs.promises.readdir(filename, 'utf-8');
            fileInfos = content.map(e => `${dir}/${e}`);
        } else {
            fileInfos.push(filename);
        }
        //function part for generating an index file to go to sample pages.
        const linkTags = [];
        linkTags.push(`<h1>${filename} - Information Page</h1></n>`);
        for(const file of fileInfos) {
            const name = file.split(pathDelimiter)[file.split(pathDelimiter).length - 1].split('.')[0];
            linkTags.push(`<a href="./${name}.html">${name}</a></br>\n`);

            //Add to detect if the input file is .md or .txt
            if(filename.match(".md")){
                mdToHTML(file, cssUrl).then(html => {
                    saveToFile(html, outputDir, name);
                });
            }else{
                convertToHTML(file, cssUrl).then(html => {
                    saveToFile(html, outputDir, name);
                });
            }
        }
        saveToFile(header('ssg-html', cssUrl) + linkTags.join("") + footer, outputDir, 'index');
    }catch(err) {
        console.log(chalk.red(err.message));
    }
}

//link of yeargs you might can find some infos that you need to understand this code https://github.com/yargs/yargs/blob/HEAD/docs/examples.md
exports.getParams = () => yargs
                            .usage('Usage: $0 [options]')
                            .example(`After install my package, ${name} -i 'Silver Blaze.txt'`)
                            .option('i', {
                                alias: 'input',
                                describe: 'Input a file or a directory',
                                type: 'string',
                                required: true
                            })
                            .option('o', {
                                alias: 'output',
                                describe: 'Specify the output directory',
                                type: 'string'
                            })
                            .option('s', {
                                alias: 'stylesheet',
                                describe: 'Import css URL',
                                type: 'string'
                            })
                            .alias('v', 'version')
                            .version('version', `The ${chalk.green(name)}'s version is ${chalk.green(version)}`)
                            .alias('h', 'help')
                            .help('help', `Show usage information`);