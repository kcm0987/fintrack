import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({});

export const handler = async (event) => {
  const file = JSON.parse(event.body);
  const buffer = Buffer.from(file.fileContent, 'base64');

  await s3Client.send(new PutObjectCommand({
    Bucket: "fintrack-receipts",
    Key: `receipts/${file.fileName}`,
    Body: buffer,
    ContentType: file.contentType
  }));

  return { statusCode: 200, body: JSON.stringify({ message: "Receipt uploaded" }) };
};
