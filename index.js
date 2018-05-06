const dotEnv = require("dotenv").config();
const path = require("path");
const fs = require("fs");
const {exec} = require("child_process");
const git = require('git-state');

const e = command => {
  return new Promise((resolve, reject) => {
    console.log(`RUNNING: ${command}`)
    exec(command, {maxBuffer: 1024 * 100000}, (err, stout, sterr) => {
      if(err){
        console.log(command, err, sterr);
        resolve(stout);
        // reject(err, sterr);
      } else{
        console.log(command, stout);
        resolve(stout);
      }
    });
  });
};

const r = (path, commands) => {
  return new Promise((resolve, reject) => {
    let index = 0;
    let output = [];

    function loop(){
      let command = `cd ${path}\n${commands[index]}`;
      e(command)
      .then((...args) => {
        output.push(args);
        index++;
        if(index == commands.length){
          resolve(output);
        } else{
          loop();
        }
      })
      .catch((...args) => reject(args));
    }

    loop();
  });
  // return Promise.all(commands.map(c => e(`cd ${path}\n${c}`)));
};

fs.readdirSync(process.env.DIR).forEach(file => {
  let completePath = path.join(process.cwd(), process.env.DIR, file);
  if(fs.lstatSync(completePath).isDirectory()){
    console.log(completePath);
    git.isGit(completePath, function (exists) {
      if(exists){
        updateMaster(completePath);
      } else{
        const gigPath = path.join(completePath, '.gitignore')
        if(!fs.existsSync(gigPath)){
          fs.writeFileSync(gigPath, fs.readFileSync('.gitignore', 'utf-8'));
        }
        r(completePath, [
          `git init`,
          `curl -u ${process.env.GITHUB_USERNAME}:${process.env.GITHUB_PASSWORD} https://api.github.com/user/repos -d '{"name":"${file}"}'`,
          `git remote add origin https://github.com/${process.env.GITHUB_USERNAME}/${file}.git`
        ]).then(outs => {
          updateMaster(completePath);
        })
        .catch(console.log);
      }
    });
  }
});

function updateMaster(completePath){

  git.check(completePath, function (err, result) {
    if (err) throw err;
    r(completePath, [
      `git add *`,
      `git add -u *`,
      `git commit -m "Auto-update ${new Date().toString()}"`,
      `git push -uf origin master`
    ]).then(outs => {
      console.log(`UPDATED: ${completePath}`);
    })
    .catch(console.log);
  });
}
