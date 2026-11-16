//used to remove keys that start with $ or . to protect our application from nosql operator injection
const removeOperators = (value)=>{
    if(!value || typeof value!== 'object') return;
    for(const key of Object.keys(value)){
        if (key.startsWith('$') || key.includes('.')) {
            delete value[key];
        }else{
            removeOperators(value[key]);
        }
    }
};
const sanitizeInput = (req,res,next)=>{
    removeOperators(req.body);
    next();
};
module.exports = sanitizeInput;