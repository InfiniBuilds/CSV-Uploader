// ============================================================
// API CONFIGURATION
// ============================================================

const API_URL =
    "https://3j4jg2it1g.execute-api.ap-south-1.amazonaws.com/upload-url";


// ============================================================
// HTML ELEMENTS
// ============================================================

const loginButton =
    document.getElementById("loginButton");

const loginStatus =
    document.getElementById("loginStatus");

const fileInput =
    document.getElementById("fileInput");

const uploadButton =
    document.getElementById("uploadButton");

const status =
    document.getElementById("status");


// ============================================================
// USERNAME
// ============================================================

let username =
    localStorage.getItem("upload_username");


// ============================================================
// INITIAL PAGE STATE
// ============================================================

if (username) {

    loginStatus.textContent =
        `Username: ${username}`;

    loginButton.textContent =
        "Change Username";

} else {

    loginStatus.textContent =
        "Please enter your username.";

}


// ============================================================
// ENTER USERNAME
// ============================================================

loginButton.addEventListener(
    "click",
    () => {

        const enteredUsername =
            prompt(
                "Enter your username:"
            );


        if (
            enteredUsername === null
        ) {

            return;
        }


        const cleanedUsername =
            enteredUsername.trim();


        // ----------------------------------------------------
        // Validate username
        // ----------------------------------------------------

        if (!cleanedUsername) {

            loginStatus.textContent =
                "Username cannot be empty.";

            return;
        }


        if (
            cleanedUsername.length > 50
        ) {

            loginStatus.textContent =
                "Username is too long.";

            return;
        }


        if (
            !/^[A-Za-z0-9_-]+$/.test(
                cleanedUsername
            )
        ) {

            loginStatus.textContent =
                "Username can contain only letters, numbers, - and _.";

            return;
        }


        // ----------------------------------------------------
        // Save username
        // ----------------------------------------------------

        username =
            cleanedUsername;

        localStorage.setItem(
            "upload_username",
            username
        );


        loginStatus.textContent =
            `Username: ${username}`;

        loginButton.textContent =
            "Change Username";


        status.textContent =
            "Username set. You can now upload CSV files.";

    }
);


// ============================================================
// CSV UPLOAD
// ============================================================

uploadButton.addEventListener(
    "click",
    async () => {


        // ====================================================
        // CHECK USERNAME
        // ====================================================

        if (!username) {

            status.textContent =
                "Please enter your username first.";

            return;
        }


        // ====================================================
        // GET FILES
        // ====================================================

        const files =
            Array.from(
                fileInput.files
            );


        if (
            files.length === 0
        ) {

            status.textContent =
                "Please choose at least one CSV file.";

            return;
        }


        // ====================================================
        // VALIDATE FILES
        // ====================================================

        for (
            const file of files
        ) {

            if (
                !file.name
                    .toLowerCase()
                    .endsWith(".csv")
            ) {

                status.textContent =
                    `Only CSV files are allowed: ${file.name}`;

                return;
            }

        }


        // ====================================================
        // START UPLOAD
        // ====================================================

        try {

            status.textContent =
                `Preparing ${files.length} upload(s)...`;


            // =================================================
            // REQUEST PRESIGNED URLS
            // =================================================

            const response =
                await fetch(
                    API_URL,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                username:
                                    username,

                                files:
                                    files.map(
                                        file => ({

                                            filename:
                                                file.name,

                                            contentType:
                                                "text/csv"

                                        })
                                    )

                            })

                    }
                );


            // =================================================
            // CHECK API RESPONSE
            // =================================================

            if (
                !response.ok
            ) {

                const errorText =
                    await response.text();

                console.error(
                    "API Gateway error:",
                    response.status,
                    errorText
                );

                throw new Error(
                    `API request failed: ${response.status}`
                );

            }


            // =================================================
            // READ RESPONSE
            // =================================================

            const data =
                await response.json();


            console.log(
                "Presigned URLs generated:",
                data
            );


            // =================================================
            // UPLOAD FILES TO S3
            // =================================================

            const uploadResults =
                await Promise.all(

                    data.files.map(

                        async (
                            uploadInfo,
                            index
                        ) => {

                            const file =
                                files[index];


                            // ---------------------------------
                            // Lambda rejected this file
                            // ---------------------------------

                            if (
                                !uploadInfo.success
                            ) {

                                return {

                                    filename:
                                        file.name,

                                    success:
                                        false,

                                    error:
                                        uploadInfo.error

                                };

                            }


                            try {

                                // -----------------------------
                                // PUT FILE DIRECTLY TO S3
                                // -----------------------------

                                const uploadResponse =
                                    await fetch(

                                        uploadInfo.uploadUrl,

                                        {

                                            method:
                                                "PUT",

                                            headers: {

                                                "Content-Type":
                                                    uploadInfo.contentType

                                            },

                                            body:
                                                file

                                        }

                                    );


                                if (
                                    !uploadResponse.ok
                                ) {

                                    throw new Error(

                                        `S3 upload failed: ${uploadResponse.status}`

                                    );

                                }


                                return {

                                    filename:
                                        file.name,

                                    success:
                                        true

                                };


                            } catch (
                                error
                            ) {

                                return {

                                    filename:
                                        file.name,

                                    success:
                                        false,

                                    error:
                                        error.message

                                };

                            }

                        }

                    )

                );


            // =================================================
            // SHOW RESULTS
            // =================================================

            const successful =
                uploadResults.filter(
                    result =>
                        result.success
                ).length;


            const failed =
                uploadResults.length -
                successful;


            if (
                failed === 0
            ) {

                status.textContent =
                    `Successfully uploaded ${successful} CSV file(s) for ${username}.`;

            } else {

                status.textContent =
                    `${successful} uploaded, ${failed} failed.`;

            }


            console.log(
                "Upload results:",
                uploadResults
            );


        } catch (
            error
        ) {

            console.error(
                "Upload error:",
                error
            );


            status.textContent =
                "Upload failed: " +
                error.message;

        }

    }
);