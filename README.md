# chai aur backend
let username = '   '; // string with only spaces

if (!username?.trim()) {
    console.log('Username is empty or invalid');
}

username?.trim() → removes spaces → '' (empty string)

!'' → true → prints: "Username is empty or invalid"

✅ This works correctly even if the string is only spaces.


let username = '   '; // string with only spaces

if (!username) {
    console.log('Username is empty or invalid');
}

Here, username is ' ' (string with spaces)

!username → false because ' ' is not empty, even though it has only spaces

Result: Nothing prints.

//
    channel se subscriber milega or subscriber se channel milega because both are user 
{
  $lookup: {
    from: "<other_collection>",   // the collection you want to join with
    localField: "<field_in_current_collection>", // field from current collection
    foreignField: "<field_in_other_collection>", // field from other collection
    as: "<new_array_field>"       // name of the array to store matched documents
  }
}

//
application/json → sending JSON data (normal API requests).

text/plain → sending plain text.

multipart/form-data → sending files + text fields together.

req.params → holds URL parameters (from the path).

req.query → holds query string values (?name=Gauti).

req.body → holds POST data (JSON, form-data).
