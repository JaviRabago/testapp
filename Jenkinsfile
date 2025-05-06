pipeline {
    agent any

    environment {
        // Credenciales y configuraciones
        DEV_SERVER = '172.19.0.10'
        PROD_SERVER = '172.18.0.10'
        APP_NAME = 'tasks-app'
        DEPLOY_USER = 'jenkins-deploy'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Código descargado correctamente.'
            }
        }

        stage('Setup Node.js') {
            steps {
                // Instalar Node.js si no está disponible
                sh '''
                    if ! command -v npm &> /dev/null; then
                        echo "Instalando Node.js..."
                        curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
                        sudo apt-get install -y nodejs
                    fi
                    npm --version
                    node --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Instalando dependencias...'
                sh 'npm install'
            }
        }

        stage('Lint') {
            steps {
                echo 'Verificando calidad del código...'
                sh 'node -c index.js'
            }
        }

        stage('Build Development Image') {
            steps {
                echo 'Construyendo imagen Docker para desarrollo...'
                sh 'docker build -t ${APP_NAME}-dev:${BUILD_NUMBER} -f Dockerfile.dev .'
                sh 'docker tag ${APP_NAME}-dev:${BUILD_NUMBER} ${APP_NAME}-dev:latest'
            }
        }

        stage('Deploy to Development') {
            steps {
                echo 'Desplegando en entorno de desarrollo...'
                
                sshagent(['jenkins-ssh-key']) {
                    // Copiar docker-compose.dev.yml al servidor de desarrollo
                    sh """
                        scp -o StrictHostKeyChecking=no docker-compose.dev.yml ${DEPLOY_USER}@${DEV_SERVER}:/tmp/docker-compose.yml
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'mkdir -p /opt/${APP_NAME}'
                        scp -o StrictHostKeyChecking=no
