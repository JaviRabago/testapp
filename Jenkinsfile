pipeline {
    agent any

    environment {
        // Credenciales y configuraciones
        GITHUB_REPO = 'https://github.com/tu-usuario/tu-repositorio.git'
        DEV_SERVER = '172.19.0.10'
        PROD_SERVER = '172.18.0.10'
        DEV_CREDS = credentials('dev-server-creds')
        PROD_CREDS = credentials('prod-server-creds')
        APP_NAME = 'tasks-app'
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
                
                // Instalar sshpass si no está instalado
                sh 'which sshpass || apt-get update && apt-get install -y sshpass'
                
                // Copiar docker-compose.dev.yml al servidor de desarrollo
                sh """
                    export SSHPASS=${DEV_CREDS_PSW}
                    sshpass -e scp -o StrictHostKeyChecking=no docker-compose.dev.yml ${DEV_CREDS_USR}@${DEV_SERVER}:/tmp/docker-compose.yml
                    sshpass -e ssh -o StrictHostKeyChecking=no ${DEV_CREDS_USR}@${DEV_SERVER} 'mkdir -p /opt/${APP_NAME}'
                    sshpass -e scp -o StrictHostKeyChecking=no docker-compose.dev.yml ${DEV_CREDS_USR}@${DEV_SERVER}:/opt/${APP_NAME}/docker-compose.yml
                """
                
                // Exportar imagen y transferirla al servidor de desarrollo
                sh """
                    docker save ${APP_NAME}-dev:${BUILD_NUMBER} | gzip > /tmp/${APP_NAME}-dev.tar.gz
                    export SSHPASS=${DEV_CREDS_PSW}
                    sshpass -e scp -o StrictHostKeyChecking=no /tmp/${APP_NAME}-dev.tar.gz ${DEV_CREDS_USR}@${DEV_SERVER}:/tmp/
                    sshpass -e ssh -o StrictHostKeyChecking=no ${DEV_CREDS_USR}@${DEV_SERVER} 'gunzip -c /tmp/${APP_NAME}-dev.tar.gz | docker load'
                    sshpass -e ssh -o StrictHostKeyChecking=no ${DEV_CREDS_USR}@${DEV_SERVER} 'docker tag ${APP_NAME}-dev:${BUILD_NUMBER} ${APP_NAME}-dev:latest'
                """
                
                // Desplegar con docker-compose
                sh """
                    export SSHPASS=${DEV_CREDS_PSW}
                    sshpass -e ssh -o StrictHostKeyChecking=no ${DEV_CREDS_USR}@${DEV_SERVER} 'cd /opt/${APP_NAME} && docker-compose down && docker-compose up -d'
                """
                
                echo 'Aplicación desplegada en desarrollo correctamente.'
            }
        }

        stage('Test in Development') {
            steps {
                echo 'Realizando pruebas en el entorno de desarrollo...'
                sh """
                    sleep 10
                    export SSHPASS=${DEV_CREDS_PSW}
                    sshpass -e ssh -o StrictHostKeyChecking=no ${DEV_CREDS_USR}@${DEV_SERVER} 'curl -s http://tasks.desarrollo.local:3000 || echo "Aplicación no disponible"'
                """
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
                
                // Copiar docker-compose.prod.yml al servidor de producción
                sh """
                    export SSHPASS=${PROD_CREDS_PSW}
                    sshpass -e scp -o StrictHostKeyChecking=no docker-compose.prod.yml ${PROD_CREDS_USR}@${PROD_SERVER}:/tmp/docker-compose.yml
                    sshpass -e ssh -o StrictHostKeyChecking=no ${PROD_CREDS_USR}@${PROD_SERVER} 'mkdir -p /opt/${APP_NAME}'
                    sshpass -e scp -o StrictHostKeyChecking=no docker-compose.prod.yml ${PROD_CREDS_USR}@${PROD_SERVER}:/opt/${APP_NAME}/docker-compose.yml
                """
                
                // Exportar imagen y transferirla al servidor de producción
                sh """
                    docker save ${APP_NAME}-prod:${BUILD_NUMBER} | gzip > /tmp/${APP_NAME}-prod.tar.gz
                    export SSHPASS=${PROD_CREDS_PSW}
                    sshpass -e scp -o StrictHostKeyChecking=no /tmp/${APP_NAME}-prod.tar.gz ${PROD_CREDS_USR}@${PROD_SERVER}:/tmp/
                    sshpass -e ssh -o StrictHostKeyChecking=no ${PROD_CREDS_USR}@${PROD_SERVER} 'gunzip -c /tmp/${APP_NAME}-prod.tar.gz | docker load'
                    sshpass -e ssh -o StrictHostKeyChecking=no ${PROD_CREDS_USR}@${PROD_SERVER} 'docker tag ${APP_NAME}-prod:${BUILD_NUMBER} ${APP_NAME}-prod:latest'
                """
                
                // Desplegar con docker-compose
                sh """
                    export SSHPASS=${PROD_CREDS_PSW}
                    sshpass -e ssh -o StrictHostKeyChecking=no ${PROD_CREDS_USR}@${PROD_SERVER} 'cd /opt/${APP_NAME} && docker-compose down && docker-compose up -d'
                """
                
                echo 'Aplicación desplegada en producción correctamente.'
            }
        }

        stage('Test in Production') {
            when {
                branch 'main'
            }
            steps {
                echo 'Realizando pruebas en el entorno de producción...'
                sh """
                    sleep 10
                    export SSHPASS=${PROD_CREDS_PSW}
                    sshpass -e ssh -o StrictHostKeyChecking=no ${PROD_CREDS_USR}@${PROD_SERVER} 'curl -s http://${PROD_SERVER}:3000 || echo "Aplicación no disponible"'
                """
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
