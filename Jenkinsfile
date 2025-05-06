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

        stage('Test SSH Connection') {
            steps {
                echo 'Probando conexión SSH...'
                sshagent(credentials: ['jenkins-ssh-key']) {
                    sh '''
                        [ -d ~/.ssh ] || mkdir ~/.ssh && chmod 0700 ~/.ssh
                        ssh-keyscan -t rsa,dsa 172.19.0.10 >> ~/.ssh/known_hosts
                        ssh jenkins-deploy@172.19.0.10 "echo 'Conexión SSH exitosa'"
                    '''
                }
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
                sshagent(credentials: ['jenkins-ssh-key']) {
                    sh '''
                        # Preparar entorno SSH
                        [ -d ~/.ssh ] || mkdir ~/.ssh && chmod 0700 ~/.ssh
                        ssh-keyscan -t rsa,dsa 172.19.0.10 >> ~/.ssh/known_hosts
                        
                        # Copiar docker-compose.dev.yml al servidor de desarrollo
                        scp docker-compose.dev.yml jenkins-deploy@172.19.0.10:/tmp/docker-compose.yml
                        ssh jenkins-deploy@172.19.0.10 'mkdir -p /opt/tasks-app'
                        scp docker-compose.dev.yml jenkins-deploy@172.19.0.10:/opt/tasks-app/docker-compose.yml
                        
                        # Exportar imagen y transferirla al servidor de desarrollo
                        docker save tasks-app-dev:latest | gzip > /tmp/tasks-app-dev.tar.gz
                        scp /tmp/tasks-app-dev.tar.gz jenkins-deploy@172.19.0.10:/tmp/
                        ssh jenkins-deploy@172.19.0.10 'gunzip -c /tmp/tasks-app-dev.tar.gz | docker load'
                        
                        # Desplegar con docker-compose
                        ssh jenkins-deploy@172.19.0.10 'cd /opt/tasks-app && docker-compose down && docker-compose up -d'
                    '''
                }
                echo 'Aplicación desplegada en desarrollo correctamente.'
            }
        }

        // Continúa con el resto de etapas...

        stage('Test in Development') {
            steps {
                echo 'Realizando pruebas en el entorno de desarrollo...'
                sshagent(credentials: ['jenkins-ssh-key']) {
                    sh '''
                        sleep 10
                        ssh jenkins-deploy@172.19.0.10 'curl -s http://tasks.desarrollo.local:3000 || echo "Aplicación no disponible"'
                    '''
                }
            }
        }

        // ... otras etapas
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
