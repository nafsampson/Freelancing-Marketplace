//REFERENCE INSY 7314 module manual pg 93
const Allowed_Roles = ['Client', 'Freelancer']; // Only Client and Freelancer roles may self-register. Admin must be seeded securely.


//validating the users input when registering
const validateRegisterInput = (req, res, next) => {
    const { name, email, password, role } = req.body;

    //if email, password, name or role is missing when registering then the error message is shown
    if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Full name, email, role and password are required' });
    }

    //if name, email or password isnt a string then error message is shown
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string')
     {
        return res.status(400).json({ success:false, message: 'Full name, email and password must be text values' });
     }
     // protects from scripting attacks and injection
     if (/[<>]/.test(name)) {
        return res.status(400).json({ success:false, message: 'Full name cannot contain < or > characters' });
     }
     //ensuring a valid email address is entered. Ensures there is an @ as well as a .
    if (!/^\S+@\S+\.\S+$/.test(email)) 
     {
        return res.status(400).json({ success:false, message: 'Please provide a valid email address' });
     }

     //ensures the password is between 8 and 72 characters
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72)
     {
        return res.status(400).json({ success:false, message: 'Password must be at least 8 characters and at most 72 UTF-8 bytes.' });
     }
     //ensures only allowed roles are entered
    if(!Allowed_Roles.includes(role))
     {
        return res.status(400).json({ success: false, message: 'Please choose a valid role. Options are Client and Freelancer' });
     }

    req.body = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role
    };

    next();
};

//validating the users input when logging in
const validateLoginInput = (req, res, next) => {
    const { email, password } = req.body;

    //ensuring email and password is entered
    if (!email || !password) 
     {
        return res.status(400).json({ success:false, message: 'Email and password are required' });
     }

     // ensuring they are both strings
    if (typeof email !== 'string' || typeof password !== 'string') 
     {
        return res.status(400).json({ success:false, message: 'Email and password must be text values' });
     }

    req.body = {
    email: email.toLowerCase().trim(),
    password
    };

    next();
};

module.exports = {
 validateRegisterInput,
 validateLoginInput
}; 
