Object.extend = function(des, src){

  if(!des) des = {};

  for(var p in src){
    if(!des[p]) des[p] = src[p];
  }

  return des;
}