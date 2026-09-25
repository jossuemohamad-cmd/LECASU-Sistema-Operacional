import os
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from typing import Optional

# Neon S3 Storage Configurations (lidas apenas de variáveis de ambiente)
AWS_ENDPOINT_URL_S3 = os.getenv("AWS_ENDPOINT_URL_S3")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
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


def list_s3_objects(prefix: str = "ged/", bucket: Optional[str] = None) -> list:
    """
    Lista ficheiros existentes no bucket Neon S3 sob um determinado prefixo.
    """
    target_bucket = bucket or S3_BUCKET_NAME
    client = get_s3_client()
    try:
        response = client.list_objects_v2(Bucket=target_bucket, Prefix=prefix)
        contents = response.get("Contents", [])
        return [
            {
                "key": obj["Key"],
                "size": obj["Size"],
                "last_modified": obj["LastModified"].isoformat() if "LastModified" in obj else None
            }
            for obj in contents
        ]
    except Exception as e:
        print(f"Erro ao listar objetos no Neon S3: {e}")
        return []


def delete_file_from_s3(key: str, bucket: Optional[str] = None) -> bool:
    """
    Remove ficheiro do bucket S3.
    """
    target_bucket = bucket or S3_BUCKET_NAME
    client = get_s3_client()
    try:
        client.delete_object(Bucket=target_bucket, Key=key)
        return True
    except ClientError as e:
        print(f"Erro ao deletar objeto {key} do Neon S3: {e}")
        return False
    except Exception as e:
        print(f"Erro inesperado ao deletar do S3: {e}")
        return False


STANDARD_GED_FOLDERS = [
    'etc', 'logs', 'mail', 'public_html', 'pdf', 'planilhas', 'word', 
    'png', 'jpg', 'logos', 'projetos_cad', 'contratos', 'rh_pessoal', 
    'ssl', 'tmp', 'geral'
]


def ensure_s3_folders_exist(folders: Optional[list] = None, bucket: Optional[str] = None):
    """
    Cria fisicamente todos os marcadores de pasta no bucket Neon S3 (ged/<pasta>/.keep)
    para que apareçam 100% sincronizados tanto no console S3 quanto no ERP.
    """
    target_bucket = bucket or S3_BUCKET_NAME
    client = get_s3_client()
    target_folders = folders or STANDARD_GED_FOLDERS
    for folder in target_folders:
        clean_folder = folder.strip().lower().replace(" ", "_")
        key = f"ged/{clean_folder}/.keep"
        try:
            client.put_object(
                Bucket=target_bucket,
                Key=key,
                Body=b"",
                ContentType="application/x-directory"
            )
        except Exception as e:
            print(f"Aviso ao criar pasta S3 {clean_folder}: {e}")


def create_s3_folder(folder_name: str, bucket: Optional[str] = None) -> bool:
    """Cria marcador de pasta no Neon S3"""
    target_bucket = bucket or S3_BUCKET_NAME
    clean_folder = folder_name.strip().lower().replace(" ", "_")
    key = f"ged/{clean_folder}/.keep"
    try:
        client = get_s3_client()
        client.put_object(
            Bucket=target_bucket,
            Key=key,
            Body=b"",
            ContentType="application/x-directory"
        )
        return True
    except Exception as e:
        print(f"Erro ao criar pasta S3 {folder_name}: {e}")
        return False


def delete_s3_folder(folder_name: str, bucket: Optional[str] = None) -> bool:
    """Deleta pasta e todos os seus objetos do Neon S3"""
    target_bucket = bucket or S3_BUCKET_NAME
    clean_folder = folder_name.strip().lower().replace(" ", "_")
    prefix = f"ged/{clean_folder}/"
    client = get_s3_client()
    try:
        response = client.list_objects_v2(Bucket=target_bucket, Prefix=prefix)
        objects_to_delete = [{'Key': obj['Key']} for obj in response.get('Contents', [])]
        if objects_to_delete:
            client.delete_objects(Bucket=target_bucket, Delete={'Objects': objects_to_delete})
        return True
    except Exception as e:
        print(f"Erro ao deletar pasta S3 {folder_name}: {e}")
        return False


def list_s3_folders(prefix: str = "ged/", bucket: Optional[str] = None) -> list:
    """Retorna lista de pastas existentes no Neon S3 sob ged/"""
    target_bucket = bucket or S3_BUCKET_NAME
    client = get_s3_client()
    try:
        response = client.list_objects_v2(Bucket=target_bucket, Prefix=prefix, Delimiter="/")
        prefixes = response.get("CommonPrefixes", [])
        folders = []
        for p in prefixes:
            raw_folder = p.get("Prefix", "").replace("ged/", "").rstrip("/")
            if raw_folder:
                folders.append(raw_folder)
        return folders
    except Exception as e:
        print(f"Erro ao listar pastas no S3: {e}")
        return []


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

