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

        stage('Deploy to Development') {
            steps {
                echo 'Desplegando en entorno de desarrollo...'
                
                sshagent(['jenkins-ssh-key']) {
                    // Verificar conectividad SSH básica
                    sh """
                        echo "Verificando conectividad SSH con el servidor de desarrollo..."
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'echo "Conexión SSH exitosa"'
                    """
                    
                    // Verificar Docker en servidor de desarrollo
                    sh """
                        echo "Verificando Docker en servidor de desarrollo..."
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'docker --version || echo "Docker no disponible"'
                    """
                    
                    // Verificar espacio en disco
                    sh """
                        echo "Verificando espacio en disco en servidor de desarrollo..."
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'df -h'
                    """
                    
                    // Copiar docker-compose.dev.yml al servidor de desarrollo
                    sh """
                        echo "Copiando docker-compose.dev.yml al servidor..."
                        scp -o StrictHostKeyChecking=no docker-compose.dev.yml ${DEPLOY_USER}@${DEV_SERVER}:/tmp/docker-compose.yml
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'mkdir -p /opt/${APP_NAME}'
                        scp -o StrictHostKeyChecking=no docker-compose.dev.yml ${DEPLOY_USER}@${DEV_SERVER}:/opt/${APP_NAME}/docker-compose.yml
                        echo "docker-compose.dev.yml copiado correctamente"
                    """
                    
                    // Exportar imagen y transferirla al servidor de desarrollo
                    sh """
                        echo "Guardando imagen Docker localmente..."
                        docker save ${APP_NAME}-dev:${BUILD_NUMBER} | gzip > /tmp/${APP_NAME}-dev.tar.gz
                        ls -lh /tmp/${APP_NAME}-dev.tar.gz
                        
                        echo "Transfiriendo imagen al servidor de desarrollo..."
                        scp -o StrictHostKeyChecking=no /tmp/${APP_NAME}-dev.tar.gz ${DEPLOY_USER}@${DEV_SERVER}:/tmp/
                        echo "Imagen transferida correctamente"
                        
                        echo "Cargando imagen en Docker del servidor..."
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'gunzip -c /tmp/${APP_NAME}-dev.tar.gz | docker load'
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'docker tag ${APP_NAME}-dev:${BUILD_NUMBER} ${APP_NAME}-dev:latest'
                        echo "Imagen cargada correctamente"
                    """
                    
                    // Desplegar con docker-compose
                    sh """
                        echo "Desplegando con docker-compose..."
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEV_SERVER} 'cd /opt/${APP_NAME} && docker-compose down && docker-compose up -d'
                        echo "Aplicación desplegada correctamente"
                    """
                }
                
                echo 'Aplicación desplegada en desarrollo correctamente.'
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
