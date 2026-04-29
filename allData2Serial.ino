#include <Esplora.h>

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    ;
  }
}

void loop() {
  int joystickX = Esplora.readJoystickX();
  int joystickY = Esplora.readJoystickY();
  int slider = Esplora.readSlider();
  int lightSensor = Esplora.readLightSensor();
  int temperature = Esplora.readTemperature();
  int microphone = Esplora.readMicrophone();
  int buttonUp = Esplora.readButton(SWITCH_UP) ? 1 : 0;
  int buttonDown = Esplora.readButton(SWITCH_DOWN) ? 1 : 0;

  Serial.print("{");
  Serial.print("\"joystickX\":"); Serial.print(joystickX); Serial.print(",");
  Serial.print("\"joystickY\":"); Serial.print(joystickY); Serial.print(",");
  Serial.print("\"slider\":"); Serial.print(slider); Serial.print(",");
  Serial.print("\"light\":"); Serial.print(lightSensor); Serial.print(",");
  Serial.print("\"temperature\":"); Serial.print(temperature); Serial.print(",");
  Serial.print("\"microphone\":"); Serial.print(microphone); Serial.print(",");
  Serial.print("\"buttonUp\":"); Serial.print(buttonUp); Serial.print(",");
  Serial.print("\"buttonDown\":"); Serial.print(buttonDown);
  Serial.println("}");

  delay(200);
}