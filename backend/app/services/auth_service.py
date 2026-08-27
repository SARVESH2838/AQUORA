import os
import sqlite3
import uuid

from datetime import (
    datetime,
    timedelta,
    timezone,
)

from pathlib import Path

import jwt

from pwdlib import PasswordHash


# =========================================================
# DATABASE
# =========================================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parents[2]
)

DB_PATH = (
    BASE_DIR
    / "aquora.db"
)


# =========================================================
# PASSWORD HASHING
# =========================================================

password_hasher = (
    PasswordHash.recommended()
)


# =========================================================
# JWT CONFIGURATION
#
# Prototype fallback secret.
# For production:
# store AQUORA_JWT_SECRET in environment variables.
# =========================================================

JWT_SECRET = os.getenv(
    "AQUORA_JWT_SECRET",
    "aquora-prototype-secret-change-in-production-2026",
)

JWT_ALGORITHM = "HS256"

JWT_EXPIRY_HOURS = 12


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_connection():

    connection = sqlite3.connect(
        DB_PATH
    )

    connection.row_factory = (
        sqlite3.Row
    )

    return connection


# =========================================================
# INITIALIZE DATABASE
# =========================================================

def init_auth_db():

    connection = (
        get_connection()
    )

    try:

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (

                id TEXT PRIMARY KEY,

                full_name TEXT NOT NULL,

                email TEXT NOT NULL UNIQUE,

                institution TEXT NOT NULL,

                password_hash TEXT NOT NULL,

                verification_status TEXT NOT NULL
                    DEFAULT 'UNVERIFIED',

                created_at TEXT NOT NULL

            )
            """
        )

        connection.commit()

    finally:

        connection.close()


# =========================================================
# NORMALIZE EMAIL
# =========================================================

def normalize_email(
    email: str,
):

    return (
        email
        .strip()
        .lower()
    )


# =========================================================
# BASIC EMAIL VALIDATION
# =========================================================

def is_valid_email(
    email: str,
):

    email = (
        normalize_email(
            email
        )
    )

    return (
        "@" in email
        and "." in email.split(
            "@"
        )[-1]
        and len(email) >= 5
    )


# =========================================================
# PASSWORD HASHING
# =========================================================

def hash_password(
    password: str,
):

    return (
        password_hasher.hash(
            password
        )
    )


# =========================================================
# VERIFY PASSWORD
# =========================================================

def verify_password(
    password: str,
    password_hash: str,
):

    try:

        return (
            password_hasher.verify(
                password,
                password_hash,
            )
        )

    except Exception:

        return False


# =========================================================
# SERIALIZE USER
# =========================================================

def serialize_user(
    user,
):

    if not user:

        return None


    return {

        "id":
            user["id"],

        "fullName":
            user["full_name"],

        "email":
            user["email"],

        "institution":
            user["institution"],

        "verificationStatus":
            user[
                "verification_status"
            ],

        "createdAt":
            user["created_at"],
    }


# =========================================================
# GET USER BY EMAIL
# =========================================================

def get_user_by_email(
    email: str,
):

    email = (
        normalize_email(
            email
        )
    )


    connection = (
        get_connection()
    )

    try:

        cursor = (
            connection.execute(
                """
                SELECT *
                FROM users
                WHERE email = ?
                """,
                (
                    email,
                ),
            )
        )

        return (
            cursor.fetchone()
        )

    finally:

        connection.close()


# =========================================================
# GET USER BY ID
# =========================================================

def get_user_by_id(
    user_id: str,
):

    connection = (
        get_connection()
    )

    try:

        cursor = (
            connection.execute(
                """
                SELECT *
                FROM users
                WHERE id = ?
                """,
                (
                    user_id,
                ),
            )
        )

        return (
            cursor.fetchone()
        )

    finally:

        connection.close()


# =========================================================
# CREATE USER
# =========================================================

def create_user(
    full_name: str,
    email: str,
    institution: str,
    password: str,
):

    email = (
        normalize_email(
            email
        )
    )


    if get_user_by_email(
        email
    ):

        raise ValueError(
            "An account already exists with this email."
        )


    user_id = (
        str(
            uuid.uuid4()
        )
    )


    created_at = (
        datetime.now(
            timezone.utc
        ).isoformat()
    )


    password_hash = (
        hash_password(
            password
        )
    )


    connection = (
        get_connection()
    )

    try:

        connection.execute(
            """
            INSERT INTO users (

                id,
                full_name,
                email,
                institution,
                password_hash,
                verification_status,
                created_at

            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                full_name.strip(),
                email,
                institution.strip(),
                password_hash,
                "UNVERIFIED",
                created_at,
            ),
        )

        connection.commit()

    finally:

        connection.close()


    return (
        get_user_by_id(
            user_id
        )
    )


# =========================================================
# AUTHENTICATE USER
# =========================================================

def authenticate_user(
    email: str,
    password: str,
):

    user = (
        get_user_by_email(
            email
        )
    )


    if not user:

        return None


    if not verify_password(
        password,
        user["password_hash"],
    ):

        return None


    return user


# =========================================================
# CREATE JWT
# =========================================================

def create_access_token(
    user,
):

    now = (
        datetime.now(
            timezone.utc
        )
    )


    expires_at = (
        now
        + timedelta(
            hours=
                JWT_EXPIRY_HOURS
        )
    )


    payload = {

        "sub":
            user["id"],

        "email":
            user["email"],

        "iat":
            now,

        "exp":
            expires_at,

        "type":
            "access",
    }


    return (
        jwt.encode(
            payload,
            JWT_SECRET,
            algorithm=
                JWT_ALGORITHM,
        )
    )


# =========================================================
# DECODE JWT
# =========================================================

def decode_access_token(
    token: str,
):

    try:

        payload = (
            jwt.decode(
                token,
                JWT_SECRET,
                algorithms=[
                    JWT_ALGORITHM
                ],
            )
        )


        if (
            payload.get(
                "type"
            )
            != "access"
        ):

            return None


        return payload


    except jwt.InvalidTokenError:

        return None


# =========================================================
# INITIALIZE AUTH TABLE
# =========================================================

init_auth_db()