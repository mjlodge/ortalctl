FROM mathewlodge/nodepi:latest  
ENTRYPOINT []

RUN apt-get update && apt-get install python build-essential
RUN mkdir /home/ortalctl
WORKDIR /home/ortalctl
RUN set -eux;\
	wget -O pigpio.tar http://abyz.co.uk/rpi/pigpio/pigpio.tar;\
	tar -xvf pigpio.tar;\
	rm pigpio.tar;\
	cd PIGPIO;\
	make && make install;
RUN npm install restify pigpio
COPY ortalctl.js /home/ortalctl
EXPOSE 8000
CMD ["node","ortalctl.js"]
