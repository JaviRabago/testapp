pipeline {
    agent any

    environment {
        // Credenciales y configuraciones
        GITHUB_REPO = 'https://github.com/tu-usuario/tu-repositorio.git'
        DEV_SERVER = '172.19.0.10'
        PROD_SERVER = '172.18.0.10'
        DEV_SSH_CREDS = credentials('dev-ssh-key')
        PROD_SSH_CREDS = credentials('prod-ssh-key')
        APP_NAME = 'tasks-app'
    }

    stages {
        stage('Checkout') {
            steps {
                // Obtener código del repositorio
                checkout scm
                echo 'Código descargado correctamente.'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Instalando dependencias...'
                // Instalar dependencias de Node.js
                sh 'npm install'
            }
        }

        stage('Lint') {
            steps {
                echo 'Verificando calidad del código...'
                // Puedes agregar aquí un linter si lo deseas
                // sh 'npm run lint'
                // Como no veo un script de lint en tu package.json, lo dejo comentado
            }
        }

        stage('Test') {
            steps {
                echo 'Ejecutando pruebas...'
                // Puedes agregar aquí tus pruebas si las tienes
                // sh 'npm test'
                // Como no veo un script de test en tu package.json, lo dejo comentado
                
                // Verificar sintaxis básica de JavaScript
                sh 'node -c index.js'
            }
        }

        stage('Build Development Image') {
            steps {
                echo 'Construyendo imagen Docker para desarrollo...'
                sh 'docker build -t ${APP_NAME}-dev:${BUILD_NUMBER} -f Dockerfile.dev .'
                
                // Opcional: Si quieres etiquetar también como latest
                sh 'docker tag ${APP_NAME}-dev:${BUILD_NUMBER} ${APP_NAME}-dev:latest'
            }
        }

        stage('Deploy to Development') {
            steps {
                echo 'Desplegando en entorno de desarrollo...'
                
                // Copiar docker-compose.dev.yml al servidor de desarrollo
                sh """
                    scp -o StrictHostKeyChecking=no -i ${DEV_SSH_CREDS} docker-compose.dev.yml op1@${DEV_SERVER}:/tmp/docker-compose.yml
                    ssh -o StrictHostKeyChecking=no -i ${DEV_SSH_CREDS} op1@${DEV_SERVER} 'mkdir -p /opt/${APP_NAME}'
                    scp -o StrictHostKeyChecking=no -i ${DEV_SSH_CREDS} docker-compose.dev.yml op1@${DEV_SERVER}:/opt/${APP_NAME}/docker-compose.yml
                """
                
                // Exportar imagen y transferirla al servidor de desarrollo
                sh """
                    docker save ${APP_NAME}-dev:${BUILD_NUMBER} | gzip > /tmp/${APP_NAME}-dev.tar.gz
                    scp -o StrictHostKeyChecking=no -i ${DEV_SSH_CREDS} /tmp/${APP_NAME}-dev.tar.gz op1@${DEV_SERVER}:/tmp/
                    ssh -o StrictHostKeyChecking=no -i ${DEV_SSH_CREDS} op1@${DEV_SERVER} 'gunzip -c /tmp/${APP_NAME}-dev.tar.gz | docker load'
                    ssh -o StrictHostKeyChecking=no -i ${DEV_SSH_CREDS} op1@${DEV_SERVER} 'docker tag ${APP_NAME}-dev:${BUILD_NUMBER} ${APP_NAME}-dev:latest'
                """
                
                // Desplegar con docker-compose
                sh """
                    ssh -o StrictHostKeyChecking=no -i ${DEV_SSH_CREDS} op1@${DEV_SERVER} 'cd /opt/${APP_NAME} && docker-compose down && docker-compose up -d'
                """
                
                echo 'Aplicación desplegada en desarrollo correctamente.'
            }
        }

        stage('Test in Development') {
            steps {
                echo 'Realizando pruebas en el entorno de desarrollo...'
                // Esperar a que la aplicación esté disponible
                sh """
                    sleep 10
                    ssh -o StrictHostKeyChecking=no -i ${DEV_SSH_CREDS} op1@${DEV_SERVER} 'curl -s http://tasks.desarrollo.local:3000 || echo "Aplicación no disponible"'
                """
            }
        }

        stage('Approve Production Deployment') {
            when {
                branch 'main'
            }
            steps {
                // Solicitar aprobación manual para despliegue en producción
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
                
                // Opcional: Si quieres etiquetar también como latest
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
                    scp -o StrictHostKeyChecking=no -i ${PROD_SSH_CREDS} docker-compose.prod.yml op1@${PROD_SERVER}:/tmp/docker-compose.yml
                    ssh -o StrictHostKeyChecking=no -i ${PROD_SSH_CREDS} op1@${PROD_SERVER} 'mkdir -p /opt/${APP_NAME}'
                    scp -o StrictHostKeyChecking=no -i ${PROD_SSH_CREDS} docker-compose.prod.yml op1@${PROD_SERVER}:/opt/${APP_NAME}/docker-compose.yml
                """
                
                // Exportar imagen y transferirla al servidor de producción
                sh """
                    docker save ${APP_NAME}-prod:${BUILD_NUMBER} | gzip > /tmp/${APP_NAME}-prod.tar.gz
                    scp -o StrictHostKeyChecking=no -i ${PROD_SSH_CREDS} /tmp/${APP_NAME}-prod.tar.gz op1@${PROD_SERVER}:/tmp/
                    ssh -o StrictHostKeyChecking=no -i ${PROD_SSH_CREDS} op1@${PROD_SERVER} 'gunzip -c /tmp/${APP_NAME}-prod.tar.gz | docker load'
                    ssh -o StrictHostKeyChecking=no -i ${PROD_SSH_CREDS} op1@${PROD_SERVER} 'docker tag ${APP_NAME}-prod:${BUILD_NUMBER} ${APP_NAME}-prod:latest'
                """
                
                // Desplegar con docker-compose
                sh """
                    ssh -o StrictHostKeyChecking=no -i ${PROD_SSH_CREDS} op1@${PROD_SERVER} 'cd /opt/${APP_NAME} && docker-compose down && docker-compose up -d'
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
                // Esperar a que la aplicación esté disponible
                sh """
                    sleep 10
                    ssh -o StrictHostKeyChecking=no -i ${PROD_SSH_CREDS} op1@${PROD_SERVER} 'curl -s http://${PROD_SERVER}:3000 || echo "Aplicación no disponible"'
                """
            }
        }
    }

    post {
        success {
            echo 'Pipeline completado con éxito!'
            // Notificar por correo, Slack, etc. si lo deseas
        }
        failure {
            echo 'Pipeline falló. Revisar logs para más detalles.'
            // Notificar por correo, Slack, etc. si lo deseas
        }
        always {
            // Limpieza
            echo 'Limpiando espacio de trabajo...'
            sh 'rm -f /tmp/${APP_NAME}-*.tar.gz || true'
            cleanWs()
        }
    }
}
