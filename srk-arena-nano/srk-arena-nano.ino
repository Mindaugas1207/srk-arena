#include <FastLED.h>
#include <stdio.h>
#define LED_PIN1 7 //CENTRAS
#define LED_PIN2 8 //DESINIS
#define LED_PIN3 9 //KAIRIS
#define NUM_LEDS1 57
#define NUM_LEDS2 57
#define NUM_LEDS3 57
#define INP_PIN1 2 //GRYBUKS
#define INP_PIN2 3 //DESINIS DANGTIS
#define INP_PIN3 4 //KAIRIS DANGTIS
#define INP_PIN4 5 //DESINIS MIGTUKS
#define INP_PIN5 6 //KAIRIS MIGTUKS
#define OUT_PIN1 10 //KAIRE DVIGUBA //0 ON
#define OUT_PIN2 11 //VIENS //1 ON
#define OUT_PIN3 12 //DESINIS DVIGUBAS //0 ON

CRGB leds1[NUM_LEDS1];
CRGB leds2[NUM_LEDS2];
CRGB leds3[NUM_LEDS3];

CRGB C1;
CRGB C2;
CRGB C3;

CRGB C1_on;
CRGB C2_on;
CRGB C3_on;

CRGB C1_off;
CRGB C2_off;
CRGB C3_off;

bool led1_state = false;
bool led2_state = false;
bool led3_state = false;

unsigned long t_led1_now = 0;
unsigned long t_led2_now = 0;
unsigned long t_led3_now = 0;

unsigned long t_led1_on_period = 0;
unsigned long t_led2_on_period = 0;
unsigned long t_led3_on_period = 0;

unsigned long t_led1_off_period = 0;
unsigned long t_led2_off_period = 0;
unsigned long t_led3_off_period = 0;

int INP_PINS[5] = {INP_PIN1, INP_PIN2, INP_PIN3, INP_PIN4, INP_PIN5};

int INP[5] = {0,0,0,0,0};
int OUT[3] = {0,0,0};

unsigned long t_inp_print = 0;

unsigned long t_inp_debounce[5] = {0,0,0,0,0};
#define DEBOUNCE_TIME 100

#define EM_INP 0
#define RD_INP 1
#define LD_INP 2

int readInput(int idx)
{
  if (millis() - t_inp_debounce[idx] > DEBOUNCE_TIME)
  {
    int tmp = !digitalRead(INP_PINS[idx]);
    if (tmp != INP[idx])
    {
      INP[idx] = tmp;
      t_inp_debounce[idx] = millis();
      return 1;
    }
  }
  return 0;
}

void setup() {
  Serial.begin(9600);
  pinMode(OUT_PIN1, OUTPUT);
  pinMode(OUT_PIN2, OUTPUT);
  pinMode(OUT_PIN3, OUTPUT);

  pinMode(INP_PIN1, INPUT_PULLUP);
  pinMode(INP_PIN2, INPUT_PULLUP);
  pinMode(INP_PIN3, INPUT_PULLUP);
  pinMode(INP_PIN4, INPUT_PULLUP);
  pinMode(INP_PIN5, INPUT_PULLUP);
  
  FastLED.addLeds<WS2812, LED_PIN1, GRB>(leds1, NUM_LEDS1);
  FastLED.addLeds<WS2812, LED_PIN2, GRB>(leds2, NUM_LEDS2);
  FastLED.addLeds<WS2812, LED_PIN3, GRB>(leds3, NUM_LEDS3);
  C1_on = CRGB::Blue; C2_on = CRGB::Blue; C3_on = CRGB::Blue;
  C1_off = CRGB::Blue; C2_off = CRGB::Blue; C3_off = CRGB::Blue;
  fillLeds(C1_off, C2_off, C3_off);
  outWrite(OUT);
  
  delay(5);
}

bool start_ok = false;

void loop() {

  if (Serial.available()) {
    String message = "";
    message += Serial.readStringUntil('\n');
    if (parseMessage(message))
    {
      //OK
      Serial.print("OK\n");
    }
    else
    {
      //fail
      Serial.print("FAIL\n");
    }
  }
  if (start_ok && (inpRead() || millis() - t_inp_print > 1000))
  {
    t_inp_print = millis();
    Serial.print("SET:INP(");
    Serial.print(INP[0]);
    Serial.print(",");
    Serial.print(INP[1]);
    Serial.print(",");
    Serial.print(INP[2]);
    Serial.print(",");
    Serial.print(INP[3]);
    Serial.print(",");
    Serial.print(INP[4]);
    Serial.print(")\n");
  }
  if (start_ok && !INP[EM_INP] && INP[RD_INP] && INP[LD_INP])
  {
    rampProcess();
    bladeProcess();
  }
  else
  {
    rampTrigger(0);
    bladeTrigger(0, false, false, 0);
    digitalWrite(OUT_PIN1, 1);
    digitalWrite(OUT_PIN2, 0);
    digitalWrite(OUT_PIN3, 1);
  }
  
  doLeds();

  delay(1);
}

void sys_start()
{
  start_ok = true;
  delay(1000);
  Serial.print("START_OK()\n");
}

void sys_stop()
{
  start_ok = false;
  delay(1000);
  Serial.print("STOP_OK()\n");
}

bool parseMessage(String Message)
{
  int found = -1;
  if (start_ok)
  {
    found = Message.indexOf("SET:");
    if (found != -1)
      return parseSET(Message.substring(found + sizeof("SET:") - 1));
  }
  
  found = Message.indexOf("SYSTEM_START()");
  if (found != -1)
  {
    sys_start();
    return true;
  }
  found = Message.indexOf("SYSTEM_STOP()");
  if (found != -1)
  {
    sys_stop();
    return true;
  }
    
    
  return false;
}

bool parseSET(String Message)
{
  int found = Message.indexOf("LED");
  if (found != -1)
    return doSET_LED(Message.substring(sizeof("LED") - 1));
  found = Message.indexOf("SPN");
  if (found != -1)
    return doSET_SPN(Message.substring(sizeof("SPN") - 1));
  found = Message.indexOf("RMP");
  if (found != -1)
    return doSET_RMP(Message.substring(sizeof("RMP") - 1));
  found = Message.indexOf("OUT");
  if (found != -1)
    return doSET_OUT(Message.substring(sizeof("OUT") - 1));

  return false;
}

bool doSET_LED(String Message)
{
  int LedN = 0;
  int c_r = 0;
  int c_g = 0;
  int c_b = 0;
  int _c_r = 0;
  int _c_g = 0;
  int _c_b = 0;
  long on_period = 0;
  long off_period = 0;
  if (sscanf(Message.c_str(), "%d(%X,%X,%X;%X,%X,%X;%ld;%ld)", &LedN, &c_r, &c_g, &c_b, 
                                                              &_c_r, &_c_g, &_c_b,
                                                              &on_period, &off_period) != 9)
  {
    return false;
  }

  CRGB _C_on = CRGB(c_r, c_g, c_b);
  CRGB _C_off = CRGB(_c_r, _c_g, _c_b);

  if (LedN == 1)
  {
    C1_on = _C_on;
    C1_off = _C_off;
    t_led1_on_period = on_period;
    t_led1_off_period = off_period;
    t_led1_now = t_led2_now = t_led3_now = millis();
  }
  else if (LedN == 2)
  {
    C2_on = _C_on;
    C2_off = _C_off;
    t_led2_on_period = on_period;
    t_led2_off_period = off_period;
    t_led1_now = t_led2_now = t_led3_now = millis();
  }
  else if (LedN == 3)
  {
    C3_on = _C_on;
    C3_off = _C_off;
    t_led3_on_period = on_period;
    t_led3_off_period = off_period;
    t_led1_now = t_led2_now = t_led3_now = millis();
  }

  return true;
}

bool doSET_OUT(String Message)
{
  int _out[3] = {0,0,0};
  if (sscanf(Message.c_str(), "(%d,%d,%d)", &_out[0], &_out[1], &_out[2]) != 3)
  {
    return false;
  }

  outWrite(_out);

  return true;
}

bool doSET_SPN(String Message)
{
  unsigned long runTime = 0;
  int rev = 0;
  int autoRev = 0;
  unsigned long revTime = 0;
  if (sscanf(Message.c_str(), "(%ld,%d,%d,%ld)", &runTime, &rev, &autoRev, &revTime) != 4)
  {
    return false;
  }

  bladeTrigger(runTime, rev, autoRev, revTime);

  return true;
}

bool doSET_RMP(String Message)
{
  unsigned long runTime = 0;
  if (sscanf(Message.c_str(), "(%ld)", &runTime) != 1)
  {
    return false;
  }

  rampTrigger(runTime);

  return true;
}

void doLeds()
{
  unsigned long t_now = millis();

  if (t_led1_on_period == 0 || t_led1_off_period == 0)
  {
    C1 = C1_off;
    t_led1_now = t_now;
  }
  else
  {
    if (led1_state)
    {
      if (t_now - t_led1_now > t_led1_on_period)
      {
        C1 = C1_off;
        led1_state = false;
        t_led1_now = t_now;
      }
    }
    else
    {
      if (t_now - t_led1_now > t_led1_off_period)
      {
        C1 = C1_on;
        led1_state = true;
        t_led1_now = t_now;
      }
    }
  }

  if (t_led2_on_period == 0 || t_led2_off_period == 0)
  {
    C2 = C2_off;
    t_led2_now = t_now;
  }
  else
  {
    if (led2_state)
    {
      if (t_now - t_led2_now > t_led2_on_period)
      {
        C2 = C2_off;
        led2_state = false;
        t_led2_now = t_now;
      }
    }
    else
    {
      if (t_now - t_led2_now > t_led2_off_period)
      {
        C2 = C2_on;
        led2_state = true;
        t_led2_now = t_now;
      }
    }
  }

  if (t_led3_on_period == 0 || t_led3_off_period == 0)
  {
    C3 = C3_off;
    t_led3_now = t_now;
  }
  else
  {
    if (led3_state)
    {
      if (t_now - t_led3_now > t_led3_on_period)
      {
        C3 = C3_off;
        led3_state = false;
        t_led3_now = t_now;
      }
    }
    else
    {
      if (t_now - t_led3_now > t_led3_off_period)
      {
        C3 = C3_on;
        led3_state = true;
        t_led3_now = t_now;
      }
    }
  }

  fillLeds(C1, C2, C3);
}

CRGB C1_NOW = 0;
CRGB C2_NOW = 0;
CRGB C3_NOW = 0;

void fillLeds(CRGB c1, CRGB c2, CRGB c3){
  if (C1_NOW != c1 || C2_NOW != c2 || C3_NOW != c3)
  {
    C1_NOW = c1;
    C2_NOW = c2;
    C3_NOW = c3;
    for(int i = 0; i < NUM_LEDS1; i++) {
        leds1[i] = c1;
        leds2[i] = c2;
        leds3[i] = c3;
    }
    FastLED.show();
  }
}

void outWrite(int out[3])
{
  digitalWrite(OUT_PIN1, !out[0]);
  digitalWrite(OUT_PIN2, out[1]);
  digitalWrite(OUT_PIN3, !out[2]);
}

unsigned long t_ramp_start = 0;
unsigned long ramp_runTime = 0;
bool rampActive = false;
#define RAMP_OUTPUT OUT_PIN2

void rampTrigger(unsigned long runTime)
{
  ramp_runTime = runTime;
  t_ramp_start = millis();
  rampActive = runTime > 0;
}

void rampProcess()
{
  if (rampActive)
  {
    if (millis() - t_ramp_start > ramp_runTime)
    {
      t_ramp_start = millis();
      rampActive = false;
      digitalWrite(RAMP_OUTPUT, 0);
    }
    else
    {
      digitalWrite(RAMP_OUTPUT, 1);
    }
  }
  else
  {
    digitalWrite(RAMP_OUTPUT, 0);
  }
}

unsigned long t_blade_start = 0;
unsigned long blade_runTime = 0;
bool bladeActive = false;
bool bladeReverse = false;
bool bladeAutoReverse = false;
unsigned long t_blade_start_r = 0;
unsigned long blade_reverseTime = 0;
bool bladeCurrentDir = false;
#define BLADE_OUTPUT1 OUT_PIN1
#define BLADE_OUTPUT2 OUT_PIN3

void bladeTrigger(unsigned long runTime, bool rev, bool autoRev, unsigned long revTime)
{
  blade_runTime = runTime;
  t_blade_start = millis();
  t_blade_start_r = millis();
  bladeReverse = rev;
  bladeAutoReverse = autoRev;
  blade_reverseTime = revTime;
  bladeActive = runTime > 0;
}

void bladeProcess()
{
  if (bladeActive)
  {
    if (millis() - t_blade_start > blade_runTime)
    {
      t_blade_start = millis();
      bladeActive = false;
      digitalWrite(BLADE_OUTPUT1, 1);
      digitalWrite(BLADE_OUTPUT2, 1);
    }
    else
    {
      if (bladeAutoReverse)
      {
        if (millis() - t_blade_start_r > blade_reverseTime)
        {
          t_blade_start_r = millis();
          bladeReverse = !bladeReverse;
        }
      }

      if (bladeCurrentDir != bladeReverse)
      {
        digitalWrite(BLADE_OUTPUT1, 1);
        digitalWrite(BLADE_OUTPUT2, 1);
        delay(1000);
        bladeCurrentDir = bladeReverse;
      }

      if (bladeCurrentDir)
      {
        digitalWrite(BLADE_OUTPUT1, 0);
        digitalWrite(BLADE_OUTPUT2, 1);
      }
      else
      {
        digitalWrite(BLADE_OUTPUT1, 1);
        digitalWrite(BLADE_OUTPUT2, 0);
      }
    }
  }
  else
  {
    digitalWrite(BLADE_OUTPUT1, 1);
    digitalWrite(BLADE_OUTPUT2, 1);
  }
}

bool inpRead()
{
  int chng = 0;
  for (int i = 0; i < 5; i++)
  {
    chng += readInput(i);
  }
  return chng > 0;
}
