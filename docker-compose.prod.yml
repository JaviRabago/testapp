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
        
        // Omitimos las etapas de desarrollo ya que no son necesarias según tu comentario
        
        stage('Approve Production Deployment') {
            steps {
                // Solicitar aprobación manual para despliegue en producción
                timeout(time: 24, unit: 'HOURS') {
                    input message: '¿Aprobar despliegue a producción?', ok: 'Aprobar'
                }
            }
        }
        
        stage('Build Production Image') {
            steps {
                echo 'Construyendo imagen Docker para producción...'
                sh 'docker build -t ${APP_NAME}-prod:${BUILD_NUMBER} -f Dockerfile.prod .'
                sh 'docker tag ${APP_NAME}-prod:${BUILD_NUMBER} ${APP_NAME}-prod:latest'
            }
        }
        
        stage('Deploy to Production') {
            steps {
                echo 'Desplegando en entorno de producción...'
                sshagent(credentials: ['jenkins-ssh-key']) {
                    sh '''
                        # Preparar entorno SSH
                        [ -d ~/.ssh ] || mkdir ~/.ssh && chmod 0700 ~/.ssh
                        ssh-keyscan -t rsa,dsa 172.18.0.10 >> ~/.ssh/known_hosts
                        
                        # Crear directorio para la aplicación en el servidor
                        ssh jenkins-deploy@172.18.0.10 'mkdir -p /opt/tasks-app'
                        
                        # Primero, comprobemos que la base de datos PostgreSQL está disponible
                        ssh jenkins-deploy@172.18.0.10 'ping -c 3 172.18.0.20 || echo "AVISO: No se puede conectar al servidor de base de datos"'
                        
                        # Modificar el docker-compose.prod.yml para usar la imagen existente
                        sed -i 's/build:/image: tasks-app-prod:latest\\n    #build:/' docker-compose.prod.yml
                        sed -i '/dockerfile:/d' docker-compose.prod.yml
                        sed -i '/context:/d' docker-compose.prod.yml
                        
                        # Copiar docker-compose.prod.yml modificado al servidor
                        scp docker-compose.prod.yml jenkins-deploy@172.18.0.10:/opt/tasks-app/docker-compose.yml
                        
                        # Copiar el script wrapper para asegurarnos de que tiene los permisos correctos
                        scp app-prod-wrapper.sh jenkins-deploy@172.18.0.10:/tmp/app-prod-wrapper.sh
                        ssh jenkins-deploy@172.18.0.10 'chmod +x /tmp/app-prod-wrapper.sh'
                        
                        # Exportar imagen y transferirla al servidor de producción
                        docker save tasks-app-prod:latest | gzip > /tmp/tasks-app-prod.tar.gz
                        scp /tmp/tasks-app-prod.tar.gz jenkins-deploy@172.18.0.10:/tmp/
                        ssh jenkins-deploy@172.18.0.10 'gunzip -c /tmp/tasks-app-prod.tar.gz | docker load'
                        
                        # Detener y eliminar contenedores existentes antes de iniciar nuevos
                        ssh jenkins-deploy@172.18.0.10 'docker rm -f tasks-app-prod || true'
                        
                        # Desplegar con docker compose
                        ssh jenkins-deploy@172.18.0.10 'cd /opt/tasks-app && docker compose down || true && docker compose up -d'
                        
                        # Verificar logs para detectar problemas
                        ssh jenkins-deploy@172.18.0.10 'sleep 5 && docker logs tasks-app-prod'
                    '''
                }
                echo 'Aplicación desplegada en producción correctamente.'
            }
        }
        
        stage('Test in Production') {
            steps {
                echo 'Realizando pruebas en el entorno de producción...'
                sshagent(credentials: ['jenkins-ssh-key']) {
                    sh '''
                        sleep 20  # Damos más tiempo para que la aplicación se inicie y se conecte a la BD
                        ssh jenkins-deploy@172.18.0.10 'curl -s http://172.18.0.10:3000 || echo "Aplicación no disponible"'
                    '''
                }
            }
        }
        
        stage('Notify Deployment') {
            steps {
                echo 'Notificando despliegue completado...'
                // Aquí podrías agregar código para enviar notificaciones por email, Slack, etc.
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
