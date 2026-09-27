'use strict';
const fs=require('node:fs');
fs.cpSync('app','dist/srv/app',{recursive:true});
