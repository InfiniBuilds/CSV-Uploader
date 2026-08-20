# AWS CSV Uploader

A small browser-based CSV uploader backed by AWS Lambda, API Gateway, and Amazon S3.

The browser stores a validated username locally, requests short-lived S3 presigned URLs from the API, and uploads CSV files directly to S3. Files are stored under a timestamped prefix:

```text
uploads/<username>/<timestamp>/<filename>.csv
```

## Features

- Upload one or more CSV files from a browser
- Validate usernames and file extensions before upload
- Generate presigned S3 upload URLs with AWS Lambda
- Upload directly to S3 without exposing AWS credentials in the browser
- Keep each upload batch grouped by username and India Standard Time timestamp

## Project Structure

```text
.
|-- index.html       Browser UI
|-- script.js        Username, API, and S3 upload workflow
|-- style.css        Browser styles (the current page also contains inline styles)
|-- lambda.py        AWS Lambda handler for presigned URLs
|-- requirements.txt Python runtime dependencies for Lambda/local checks
|-- docs/
|   `-- DEPLOYMENT.md AWS deployment and configuration guide
`-- .gitignore       Local files and secrets excluded from Git
```

## Requirements

- Python 3.10 or newer (Python 3.13 is supported locally)
- An AWS account with an S3 bucket
- An API Gateway endpoint connected to the Lambda function
- A browser with JavaScript enabled

Install the Python dependency with:

```powershell
python -m pip install -r requirements.txt
```

The frontend has no npm dependencies and can be served as static files.

## Configuration

Update the deployment-specific values before using the application:

- `lambda.py`: `BUCKET_NAME` and `AWS_REGION`
- `script.js`: `API_URL`

Do not put AWS access keys, secret keys, or session tokens in this repository or in browser code. Lambda should use an IAM execution role.

## Run the Frontend Locally

From the project directory, start a simple local server:

```powershell
python -m http.server 8000
```

Open <http://localhost:8000> in a browser. Opening `index.html` directly may work, but a local server better matches deployment behavior.

## API Contract

The frontend sends a `POST` request to the configured API endpoint:

```json
{
  "username": "example-user",
  "files": [
    {
      "filename": "data.csv",
      "contentType": "text/csv"
    }
  ]
}
```

The Lambda returns presigned URLs for valid CSV files. The browser then sends each file with an HTTP `PUT` request to its returned URL using `Content-Type: text/csv`.

## Security Notes

- Restrict the Lambda IAM role to the required S3 bucket and object actions.
- Configure S3 CORS to allow `PUT` requests from the deployed frontend origin.
- Replace the wildcard API CORS origin with the actual frontend origin before production use.
- Presigned URLs expire after 15 minutes.
- Client-side validation improves usability; keep server-side validation as the authority.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the AWS setup checklist.

## License

No license has been selected for this repository yet. Add one before accepting external contributions.