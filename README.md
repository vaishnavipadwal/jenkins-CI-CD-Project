# 3-tier app (frontend, backend, database) on Kubernetes using Jenkins CI/CD
---

## Step 1: I Set up project structure locally (Windows / VS Code terminal)

* Create a main project folder, e.g., `3tier-app`.
* Inside it, create three folders: `frontend`, `backend`, `sql`.
* Also create a folder named `k8s` for Kubernetes manifests.

---

## Step 2: I Prepared backend (Node.js API)

* In `backend` folder, create these files:

`package.json` (example minimal):

```json
{
  "name": "backend",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.3.3"
  }
}
```

`index.js` (simple Express app listening on port 5000 and connecting to MySQL):

```js
const express = require('express');
const mysql = require('mysql2');

const app = express();
const port = 5000;

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: 'user',
  password: 'password',
  database: 'testdb'
});

app.get('/users', (req, res) => {
  connection.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
```

* Create Dockerfile inside `backend`:

```
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY index.js .
EXPOSE 5000
CMD ["node", "index.js"]
```

---

## Step 3: I Prepared frontend (Nginx static site)

* In `frontend` folder, create `index.html` (simple HTML page):

```html
<!DOCTYPE html>
<html>
<head><title>3-Tier Frontend</title></head>
<body>
<h1>Welcome to 3-Tier App Frontend</h1>
<p>Data from backend API will show here.</p>
</body>
</html>
```

* Create Dockerfile inside `frontend`:

```
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
```

---

## Step 4: I Prepared database initialization script

* In `sql` folder, create `init.sql` to create database and table with some sample data:

```sql
CREATE DATABASE IF NOT EXISTS testdb;
USE testdb;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50),
  email VARCHAR(50)
);

INSERT INTO users (name, email) VALUES
('Alice', 'alice@example.com'),
('Bob', 'bob@example.com'),
('Charlie', 'charlie@example.com');
```

---

## Step 5: I Created Kubernetes manifests in `k8s` folder

Example files:

* `mysql-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  selector:
    matchLabels:
      app: mysql
  replicas: 1
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: rootpassword
        - name: MYSQL_USER
          value: user
        - name: MYSQL_PASSWORD
          value: password
        - name: MYSQL_DATABASE
          value: testdb
        ports:
        - containerPort: 3306
        volumeMounts:
        - name: mysql-persistent-storage
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-persistent-storage
        emptyDir: {}
```

* `mysql-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  ports:
  - port: 3306
  selector:
    app: mysql
  clusterIP: None
```

* `backend-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: <dockerhub-username>/3tier-app-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: DB_HOST
          value: mysql
```

* `backend-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 5000
    targetPort: 5000
  type: ClusterIP
```

* `frontend-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: <dockerhub-username>/3tier-app-frontend:latest
        ports:
        - containerPort: 80
```

* `frontend-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

---

## Step 6: I Write Jenkinsfile in project root

```groovy
pipeline {
  agent any

  environment {
    DOCKERHUB_CREDENTIALS = 'dockerhub-cred-id'
    DOCKERHUB_USERNAME = '<dockerhub-username>'
    REPO = 'https://github.com/yourusername/3tier-app.git'
  }

  stages {
    stage('Clone repo') {
      steps {
        git branch: 'main', url: "${REPO}"
      }
    }

    stage('Build backend image') {
      steps {
        dir('backend') {
          sh 'docker build -t ${DOCKERHUB_USERNAME}/3tier-app-backend:latest .'
        }
      }
    }

    stage('Build frontend image') {
      steps {
        dir('frontend') {
          sh 'docker build -t ${DOCKERHUB_USERNAME}/3tier-app-frontend:latest .'
        }
      }
    }

    stage('Login to DockerHub') {
      steps {
        withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CREDENTIALS}", usernameVariable: 'USER', passwordVariable: 'PASS')]) {
          sh 'echo $PASS | docker login -u $USER --password-stdin'
        }
      }
    }

    stage('Push images') {
      steps {
        sh 'docker push ${DOCKERHUB_USERNAME}/3tier-app-backend:latest'
        sh 'docker push ${DOCKERHUB_USERNAME}/3tier-app-frontend:latest'
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        sh 'kubectl apply -f k8s/'
      }
    }
  }
}
```

**Note:** Replace `<dockerhub-username>`, `dockerhub-cred-id`, and Git repo URL with your actual details.

---

## Step 7: Push all files to your GitHub repo

```bash
git add .
git commit -m "Add 3-tier app with Jenkins & k8s automation"
git push origin main
```

---

## Step 8: On Jenkins server

* Configure Docker and kubectl tools
* Add DockerHub credentials with ID matching Jenkinsfile
* Create a pipeline job pointing to your GitHub repo
* Run the pipeline and monitor logs for success

---

## Step 9: Verify Kubernetes deployment

* Run:

```bash
kubectl get pods
kubectl get svc
```

* Find frontend service external IP and open it in browser to check your app.

---

# Result
The result will be that your 3-tier application is fully running on Kubernetes, with Jenkins automatically building and deploying it every time you update your code. 
You will have a working frontend website served by Nginx, a backend API running with Node.js connected to a MySQL database, all managed smoothly without manual intervention. 
This setup lets you focus on coding while Jenkins and Kubernetes handle the building, updating, and running of your app automatically.


