pipeline {
    agent any

    tools {
        nodejs "node18"
    }

    environment {
        // Credenciales y configuraciones
        GITHUB_REPO = 'https://github.com/tu-usuario/tu-repositorio.git'
        DEV_SERVER = '172.19.0.10'
        PROD_SERVER = '172.18.0.10'
        SSH_CREDS = credentials('jenkins-ssh-key')
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
                
                // Copiar docker-compose.dev.yml al servidor de desarrollo
                sh """
                    scp -o StrictHostKeyChecking=no -i ${SSH_CREDS} docker-compose.dev.yml ${DEPLOY_USER}@${DEV_SERVER}:/tmp/docker-compose.yml
                    ssh -o StrictHostKeyChecking=no -i ${SSH_CREDS} ${DEPLOY_USER}@${DEV_SERVER} 'mkdir -p /opt/${APP_NAME}'
                    scp -o StrictHostKeyChecking=no -i ${SSH_CREDS} docker-compose.dev.yml ${DEPLOY_USER}@${DEV_SERVER}:/opt/${APP_NAME}/docker-compose.yml
                """
                
                // Exportar imagen y transferirla al servidor de desarrollo
                sh """
                    docker save ${APP_NAME}-dev:${BUILD_NUMBER} | gzip > /tmp/${APP_NAME}-dev.tar.gz
                    scp -o StrictHostKeyChecking=no -i ${SSH_CREDS} /tmp/${APP_NAME}-dev.tar.gz ${DEPLOY_USER}@${DEV_SERVER}:/tmp/
                    ssh -o StrictHostKeyChecking=no -i ${SSH_CREDS} ${DEPLOY_USER}@${DEV_SERVER} 'gunzip -c /tmp/${APP_NAME}-dev.tar.gz | docker load'
                    ssh -o StrictHostKeyChecking=no -i ${SSH_CREDS} ${DEPLOY_USER}@${DEV_SERVER} 'docker tag ${APP_NAME}-dev:${BUILD_NUMBER} ${APP_NAME}-dev:latest'
                """
                
                // Desplegar con docker-compose
                sh """
                    ssh -o StrictHostKeyChecking=no -i ${SSH_CREDS} ${DEPLOY_USER}@${DEV_SERVER} 'cd /opt/${APP_NAME} && docker-compose down && docker-compose up -d'
                """
                
                echo 'Aplicación desplegada en desarrollo correctamente.'
            }
        }

        // El resto del pipeline continúa igual, pero usando ${DEPLOY_USER}@${SERVER} en lugar de usuario LDAP
        // ...
    }

    post {
        success {
            echo 'Pipeline completado con éxito!'
        }
        failure {
            echo 'Pipeline falló. Revisar logs para más detalles.'
        }
        always {
            echo 'Limpiando espacio de trabajo...'
            sh 'rm -f /tmp/${APP_NAME}-*.tar.gz || true'
            cleanWs()
        }
    }
}
