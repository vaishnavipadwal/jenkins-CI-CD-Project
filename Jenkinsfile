pipeline {
    agent any

    environment {
        DOCKER_HUB_USER = 'your-dockerhub-username'
        IMAGE_BACKEND = "${DOCKER_HUB_USER}/3tier-backend"
        IMAGE_FRONTEND = "${DOCKER_HUB_USER}/3tier-frontend"
    }

    stages {
        stage('Clone Repo') {
            steps {
                git 'https://github.com/your-username/3tier-app.git'
            }
        }

        stage('Build Backend Image') {
            steps {
                dir('backend') {
                    script {
                        docker.build("${IMAGE_BACKEND}:latest")
                    }
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                dir('frontend') {
                    script {
                        docker.build("${IMAGE_FRONTEND}:latest")
                    }
                }
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                withDockerRegistry([ credentialsId: 'docker-hub-creds', url: '' ]) {
                    script {
                        docker.image("${IMAGE_BACKEND}:latest").push()
                        docker.image("${IMAGE_FRONTEND}:latest").push()
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    sh 'kubectl apply -f k8s/mysql.yaml'
                    sh 'kubectl apply -f k8s/backend.yaml'
                    sh 'kubectl apply -f k8s/frontend.yaml'
                }
            }
        }
    }
}
