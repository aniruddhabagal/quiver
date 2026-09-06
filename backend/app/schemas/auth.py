from pydantic import EmailStr, Field

from .common import Schema


class UserOut(Schema):
    id: str
    email: str
    display_name: str


class SignupIn(Schema):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    display_name: str = Field(min_length=1, max_length=80)


class LoginIn(Schema):
    email: EmailStr
    password: str


class RefreshIn(Schema):
    refresh_token: str


class TokenPair(Schema):
    access_token: str
    refresh_token: str
    user: UserOut
