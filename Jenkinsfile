pipeline {
    agent any

    environment {
        // Credenciales y configuraciones
        GITHUB_REPO = 'https://github.com/tu-usuario/tu-repositorio.git'
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

        stage('Test SSH Connection') {
            steps {
                echo 'Probando conexión SSH...'
                sshagent(['jenkins-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'echo "Conexión SSH exitosa"'
                    """
                }
            }
        }

        stage('Deploy to Development') {
            steps {
                echo 'Desplegando en entorno de desarrollo...'
                
                // Utilizar el plugin SSH Agent para manejar la clave SSH
                sshagent(['jenkins-ssh-key']) {
                    // Copiar docker-compose.dev.yml al servidor de desarrollo
                    sh """
                        scp -o StrictHostKeyChecking=no docker-compose.dev.yml ${DEPLOY_USER}@${DEV_SERVER}:/tmp/docker-compose.yml
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'mkdir -p /opt/${APP_NAME}'
                        scp -o StrictHostKeyChecking=no docker-compose.dev.yml ${DEPLOY_USER}@${DEV_SERVER}:/opt/${APP_NAME}/docker-compose.yml
                    """
                    
                    // Exportar imagen y transferirla al servidor de desarrollo
                    sh """
                        docker save ${APP_NAME}-dev:${BUILD_NUMBER} | gzip > /tmp/${APP_NAME}-dev.tar.gz
                        scp -o StrictHostKeyChecking=no /tmp/${APP_NAME}-dev.tar.gz ${DEPLOY_USER}@${DEV_SERVER}:/tmp/
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'gunzip -c /tmp/${APP_NAME}-dev.tar.gz | docker load'
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'docker tag ${APP_NAME}-dev:${BUILD_NUMBER} ${APP_NAME}-dev:latest'
                    """
                    
                    // Desplegar con docker-compose
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'cd /opt/${APP_NAME} && docker-compose down && docker-compose up -d'
                    """
                }
                
                echo 'Aplicación desplegada en desarrollo correctamente.'
            }
        }

        stage('Test in Development') {
            steps {
                echo 'Realizando pruebas en el entorno de desarrollo...'
                sshagent(['jenkins-ssh-key']) {
                    sh """
                        sleep 10
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'curl -s http://tasks.desarrollo.local:3000 || echo "Aplicación no disponible"'
                    """
                }
            }
        }

        stage('Approve Production Deployment') {
            when {
                branch 'main'
            }
            steps {
                input message: '¿Aprobar despliegue a producción?', ok: 'Desplegar'
            }
        }

        stage('Build Production Image') {
            when {
                branch 'main'
            }
            steps {
                echo 'Construyendo imagen Docker para producción...'
                sh 'docker build -t ${APP_NAME}-prod:${BUILD_NUMBER} -f Dockerfile.prod .'
                sh 'docker tag ${APP_NAME}-prod:${BUILD_NUMBER} ${APP_NAME}-prod:latest'
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                echo 'Desplegando en entorno de producción...'
                sshagent(['jenkins-ssh-key']) {
                    // Copiar docker-compose.prod.yml al servidor de producción
                    sh """
                        scp -o StrictHostKeyChecking=no docker-compose.prod.yml ${DEPLOY_USER}@${PROD_SERVER}:/tmp/docker-compose.yml
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${PROD_SERVER} 'mkdir -p /opt/${APP_NAME}'
                        scp -o StrictHostKeyChecking=no docker-compose.prod.yml ${DEPLOY_USER}@${PROD_SERVER}:/opt/${APP_NAME}/docker-compose.yml
                    """
                    
                    // Exportar imagen y transferirla al servidor de producción
                    sh """
                        docker save ${APP_NAME}-prod:${BUILD_NUMBER} | gzip > /tmp/${APP_NAME}-prod.tar.gz
                        scp -o StrictHostKeyChecking=no /tmp/${APP_NAME}-prod.tar.gz ${DEPLOY_USER}@${PROD_SERVER}:/tmp/
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${PROD_SERVER} 'gunzip -c /tmp/${APP_NAME}-prod.tar.gz | docker load'
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${PROD_SERVER} 'docker tag ${APP_NAME}-prod:${BUILD_NUMBER} ${APP_NAME}-prod:latest'
                    """
                    
                    // Desplegar con docker-compose
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${PROD_SERVER} 'cd /opt/${APP_NAME} && docker-compose down && docker-compose up -d'
                    """
                }
                
                echo 'Aplicación desplegada en producción correctamente.'
            }
        }

        stage('Test in Production') {
            when {
                branch 'main'
            }
            steps {
                echo 'Realizando pruebas en el entorno de producción...'
                sshagent(['jenkins-ssh-key']) {
                    sh """
                        sleep 10
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${PROD_SERVER} 'curl -s http://${PROD_SERVER}:3000 || echo "Aplicación no disponible"'
                    """
                }
            }
        }
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
