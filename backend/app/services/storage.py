import os
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from typing import Optional

# Neon S3 Storage Configurations
AWS_ENDPOINT_URL_S3 = os.getenv("AWS_ENDPOINT_URL_S3", "https://br-misty-dawn-b40uhq67.storage.c-6.us-east-2.aws.neon.tech")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "nak_live_71d741f88ef345d293b0239b2c89f0e8")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "nsk_live_2bfdd86b3334ab13752c75b54ca191c23dbf4ae38ba9ed6850f2cba78be6d3bd")
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "assets")


def get_s3_client():
    """
    Retorna cliente S3 configurado para o Neon Storage.
    """
    return boto3.client(
        "s3",
        endpoint_url=AWS_ENDPOINT_URL_S3,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION,
        config=Config(s3={"addressing_style": "path"}, signature_version="s3v4")
    )


def upload_file_to_s3(
    file_bytes: bytes,
    key: str,
    content_type: str = "application/octet-stream",
    bucket: Optional[str] = None
) -> str:
    """
    Faz upload de ficheiro binário diretamente para o bucket S3 Neon.
    Retorna a chave do objeto no bucket.
    """
    target_bucket = bucket or S3_BUCKET_NAME
    client = get_s3_client()
    
    client.put_object(
        Bucket=target_bucket,
        Key=key,
        Body=file_bytes,
        ContentType=content_type
    )
    return key


def generate_presigned_url(
    key: str,
    expires_in: int = 3600,
    bucket: Optional[str] = None
) -> str:
    """
    Gera link assinado seguro temporário para visualização ou download direto.
    """
    target_bucket = bucket or S3_BUCKET_NAME
    client = get_s3_client()
    
    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": target_bucket, "Key": key},
        ExpiresIn=expires_in
    )
    return url


def delete_file_from_s3(key: str, bucket: Optional[str] = None) -> bool:
    """
    Remove ficheiro do bucket S3.
    """
    target_bucket = bucket or S3_BUCKET_NAME
    client = get_s3_client()
    try:
        client.delete_object(Bucket=target_bucket, Key=key)
        return True
    except ClientError:
        return False


def test_storage_connection() -> dict:
    """
    Testa conexão e permissões no bucket Neon S3.
    """
    try:
        client = get_s3_client()
        test_key = "system/healthcheck.txt"
        client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=test_key,
            Body=b"LECASU ERP Neon Storage Live Healthcheck OK",
            ContentType="text/plain"
        )
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET_NAME, "Key": test_key},
            ExpiresIn=3600
        )
        return {
            "status": "connected",
            "provider": "Neon S3 Object Storage",
            "endpoint": AWS_ENDPOINT_URL_S3,
            "bucket": S3_BUCKET_NAME,
            "presigned_test_url": url
        }
    except Exception as e:
        return {
            "status": "error",
            "provider": "Neon S3 Object Storage",
            "endpoint": AWS_ENDPOINT_URL_S3,
            "error": str(e)
        }
