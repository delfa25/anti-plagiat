FROM python:3.11

WORKDIR /app

COPY . .

RUN pip install django djangorestframework psycopg2-binary

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]