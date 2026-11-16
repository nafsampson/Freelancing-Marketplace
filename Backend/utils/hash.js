const bcrypt = require('bcrypt');

//hashing the plain text password that is provided by the user
const hashedPassword = async(plainPassword) =>
    {
        return await bcrypt.hash(plainPassword,12)
    };

//comparing the plain text password entered by the user with the corresponding hashed password    
const comparePasswords = async (plainPassword, hashedPassword)=>
    {
        return await bcrypt.compare(plainPassword, hashedPassword);

    };

module.exports = 
{
    hashedPassword,
    comparePasswords
}