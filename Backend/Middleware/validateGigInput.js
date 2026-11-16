const validateGigInput = (req, res, next) => {
    const { title, description, category, price, skills } = req.body;
    const errors = [];

    const validCategories = [
    "Web Development",
    "Mobile App Development",
    "UI/UX Design",
    "Graphic Design",
    "Writing & Translation",
    "Digital Marketing",
    "Video & Animation",
    "Data & Analytics",
    "Other"
    ];
    //checking for dangerous HTML angle brackets
    const containsHtmlTags = (str) => /[<>]/.test(str);

    // Validating gig title
    if (!title || typeof title !== 'string') {
        errors.push('Title is required and must be a string.');
    } else {
        const trimmedTitle = title.trim();
        if (trimmedTitle.length < 5 || trimmedTitle.length > 100) {
            errors.push('Title must be between 5 and 100 characters.');
        }
        if (containsHtmlTags(trimmedTitle)) {
            errors.push('Title cannot contain < or > characters.');
        }
    }

    // validating gigs description
    if (!description || typeof description !== 'string') {
        errors.push('Description is required and must be a string.');
    } else {
        const trimmedDesc = description.trim();
        if (trimmedDesc.length < 20 || trimmedDesc.length > 2000) {
            errors.push('Description must be between 20 and 2000 characters.');
        }
        if (containsHtmlTags(trimmedDesc)) {
            errors.push('Description cannot contain the < or > characters.');
        }
    }

    // validating gig category
    if (!category || typeof category !== 'string') {
        errors.push('Category is required and must be a string.');
    } else {
        const trimmedCat = category.trim();
        if (trimmedCat.length < 2 || trimmedCat.length > 60) {
            errors.push('Category must be between 2 and 60 characters.');
        }
        if (!validCategories.includes(trimmedCat)) {
            errors.push(`Category must be one of: ${validCategories.join(', ')}.`);
        }
        if (containsHtmlTags(trimmedCat)) {
            errors.push('Category cannot contain the < or > characters.');
        }
    }

    // the price validation 
    if (price === undefined || price === null || typeof price !== 'number' || !Number.isFinite(price) || price < 1) {
        errors.push('Price must be at least 1.');
    }
    else if (price > 10000000 || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) {
        errors.push('Price must not exceed R10,000,000 and must have at most two decimal places.');
    }



    // validation for the skills array
    const sanitizedSkills = [];
    if (skills !== undefined) {
        if (!Array.isArray(skills)) {
            errors.push('Skills must be an array.');
        } else {
            if (skills.length > 10) {
                errors.push('Skills array cannot exceed 10 items.');
            }
            for (const skill of skills) {
                if (typeof skill !== 'string') {
                    errors.push('Each skill must be a string.');
                    break;
                }
                const trimmedSkill = skill.trim();
                if (trimmedSkill.length > 30) {
                    errors.push('Each skill must be 30 characters or fewer.');
                    break;
                }
                if (containsHtmlTags(trimmedSkill)) {
                    errors.push('Skills cannot contain < or > characters.');
                    break;
                }
                sanitizedSkills.push(trimmedSkill);
            }
        }
    }

    // If any validation rule fails, return a 400 error response
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: errors[0] // or return the full errors array 
        });
    }

    // Rebuild req.body with ONLY allowed fields. This ensures freelancerId can never be spoofed by the client.
    req.body = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        price: Number(price),
        ...(skills !== undefined && { skills: sanitizedSkills })
    };

    next();
};

module.exports = { validateGigInput };
