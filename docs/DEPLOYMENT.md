# Deployment Guide

This guide describes the AWS resources required by the CSV uploader.

## 1. Create or Select an S3 Bucket

Use a bucket in the same AWS Region as the Lambda function. Set the matching bucket name and region in `lambda.py`.

The Lambda writes objects beneath the `uploads/` prefix. Enable default encryption on the bucket and keep public access blocked.

## 2. Configure S3 CORS

Apply a CORS policy that allows the deployed frontend origin to upload with presigned URLs. A development example is:

```json
[
  {
    "AllowedHeaders": ["Content-Type"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["http://localhost:8000"],
    "ExposeHeaders": ["ETag"]
  }
]
```

Replace the origin with the real static-site URL for production. Avoid using `*` for deployed applications.

## 3. Create the Lambda Function

1. Create a Python Lambda function in the same Region as the bucket.
2. Add `lambda.py` and its dependencies from `requirements.txt` to the deployment package or a Lambda layer.
3. Set the handler to `lambda.lambda_handler`.
4. Configure the Lambda execution role with the minimum required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/uploads/*"
    }
  ]
}
```

The role also needs the standard CloudWatch Logs permissions if logging is required.

## 4. Expose the Lambda Through API Gateway

Create a `POST` route such as `/upload-url` and connect it to Lambda. Enable CORS for the frontend origin and allow the `Content-Type` request header. Deploy the API and copy its invoke URL into `script.js` as `API_URL`.

The Lambda expects an API Gateway event with a JSON request body. If the body is base64 encoded by the gateway configuration, decode it before parsing or disable that behavior for this route.

## 5. Deploy the Frontend

The static files can be hosted by Amazon S3 and served through CloudFront, GitHub Pages, or another static host. Upload:

```text
index.html
script.js
style.css
```

After deployment, add the frontend origin to the S3 CORS policy and API Gateway CORS configuration.

## Verification Checklist

- Confirm the Lambda role can call `s3:PutObject` only for the intended prefix.
- Test one valid CSV and one non-CSV file.
- Confirm uploaded objects appear under `uploads/<username>/<timestamp>/`.
- Confirm the browser console has no CORS errors.
- Confirm expired presigned URLs are rejected as expected.
- Review CloudWatch logs and remove verbose logging if filenames or usernames are sensitive.